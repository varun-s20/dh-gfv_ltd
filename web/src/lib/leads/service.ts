import "server-only";

import { and, desc, eq, inArray, max, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { Db } from "@/lib/db/client";
import type { LeadEventData, LeadExtras, LeadStatus, NewLead } from "@/lib/db/schema";
import { hmac, leadReference, randomToken, safeEqual, sha256 } from "@/lib/security";
import { site } from "@/lib/site";
import { PRIVACY_VERSION, type QuoteFormValues } from "./form-schema";

type Actor = { id?: string; name?: string };

/* ---------------------------------------------------------------- attribution */

export function deriveChannel(a: QuoteFormValues["attribution"]): string {
  if (!a) return "direct";
  if (a.gclid || a.gbraid || a.wbraid || (a.utmSource === "google" && /cpc|ppc|paid/i.test(a.utmMedium ?? ""))) return "google-ads";
  if (a.fbclid || /facebook|instagram|meta/i.test(a.utmSource ?? "")) return "social";
  if (a.msclkid) return "bing-ads";
  if (/email|newsletter/i.test(a.utmMedium ?? "")) return "email";
  if (a.utmSource) return a.utmMedium ? `${a.utmSource}/${a.utmMedium}` : a.utmSource;
  const ref = a.referrer ?? "";
  if (/google\.|bing\.|duckduckgo\.|yahoo\./i.test(ref)) return "organic";
  if (/facebook\.|instagram\.|t\.co|linkedin\./i.test(ref)) return "social";
  if (ref) return "referral";
  return "direct";
}

/* ---------------------------------------------------------------- uploads */

/** Receipt proving an upload was made through our endpoint, bound to its storage key. */
export const uploadReceipt = (uploadId: string, storageKey: string) => hmac(`upload:${uploadId}:${storageKey}`);

/* ---------------------------------------------------------------- create lead */

export async function createLead(
  values: QuoteFormValues,
  ctx: { ipHash: string; userAgent: string | null },
): Promise<{ id: string; ref: string; photoCount: number }> {
  const db = await getDb();
  const a = values.attribution ?? {};

  const extras: LeadExtras = {
    fsd: values.fsd,
    eap: values.eap,
    cables: values.cables,
    batteryLeased: values.batteryLeased === "yes" ? true : values.batteryLeased === "no" ? false : undefined,
    vanFeatures: values.vanFeatures.length ? values.vanFeatures : undefined,
    vatQualifying: values.vatQualifying === "yes" ? true : values.vatQualifying === "no" ? false : undefined,
    vehicleCount: values.vehicleCount,
  };

  const row: Omit<NewLead, "ref"> = {
    category: values.category,
    registration: values.registration,
    make: values.make,
    model: values.model === "Other" ? (values.modelOther ?? "Other") : values.model,
    variant: values.variant,
    year: values.year,
    mileage: values.mileage,
    condition: values.condition,
    damage: values.damage,
    damageDetails: values.damageDetails,
    writeOff: values.writeOff,
    warningLights: values.warningLights === "yes",
    serviceHistory: values.serviceHistory,
    batteryHealth: values.batteryHealth,
    batteryHealthSource: values.batteryHealthSource,
    keys: Number(values.keys),
    finance: values.finance,
    financeLender: values.financeLender,
    financeSettlementPence: values.financeSettlement !== undefined ? values.financeSettlement * 100 : undefined,
    isRegisteredKeeper: values.isRegisteredKeeper === "yes",
    sellerType: values.sellerType,
    businessName: values.businessName,
    intent: values.intent,
    extras,
    sellerNotes: values.sellerNotes,
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    postcode: values.postcode,
    contactPreference: values.contactPreference,
    marketingOptIn: values.marketingOptIn,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    utmTerm: a.utmTerm,
    utmContent: a.utmContent,
    gclid: a.gclid,
    gbraid: a.gbraid,
    wbraid: a.wbraid,
    fbclid: a.fbclid,
    landingPage: a.landingPage,
    referrer: a.referrer,
    channel: deriveChannel(a),
    ipHash: ctx.ipHash,
    userAgent: ctx.userAgent,
    privacyVersion: PRIVACY_VERSION,
  };

  // Only attach uploads whose receipts we issued, so a client can't claim other files.
  const claimed = values.photos;
  const pending = claimed.length
    ? await db.select().from(schema.pendingUploads).where(inArray(schema.pendingUploads.id, claimed.map((p) => p.id)))
    : [];
  const pendingById = new Map(pending.map((p) => [p.id, p]));
  const verified = claimed.flatMap((photo, position) => {
    const upload = pendingById.get(photo.id);
    if (!upload || !safeEqual(uploadReceipt(upload.id, upload.storageKey), photo.receipt)) return [];
    return [{ upload, slot: photo.slot, position }];
  });

  return db.transaction(async (tx) => {
    let inserted: { id: string; ref: string } | undefined;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const ref = leadReference();
      const [created] = await tx
        .insert(schema.leads)
        .values({ ...row, ref })
        .onConflictDoNothing({ target: schema.leads.ref })
        .returning({ id: schema.leads.id, ref: schema.leads.ref });
      inserted = created;
    }
    if (!inserted) throw new Error("Could not allocate a lead reference");

    if (verified.length) {
      await tx.insert(schema.leadPhotos).values(
        verified.map(({ upload, slot, position }) => ({
          leadId: inserted.id,
          storageKey: upload.storageKey,
          slot,
          contentType: upload.contentType,
          bytes: upload.bytes,
          width: upload.width,
          height: upload.height,
          position,
        })),
      );
      await tx.delete(schema.pendingUploads).where(inArray(schema.pendingUploads.id, verified.map((v) => v.upload.id)));
    }

    await addEvent(tx as unknown as Db, inserted.id, "system", {
      kind: "system",
      body: `Lead submitted online with ${verified.length} photo${verified.length === 1 ? "" : "s"}.`,
    });
    return { ...inserted, photoCount: verified.length };
  });
}

/* ---------------------------------------------------------------- events + status */

export async function addEvent(db: Db, leadId: string, type: string, data: LeadEventData, actor: Actor = {}) {
  await db.insert(schema.leadEvents).values({ leadId, type, data, actorId: actor.id, actorName: actor.name });
}

export async function updateLeadStatus(leadId: string, to: LeadStatus, actor: Actor) {
  const db = await getDb();
  const [lead] = await db.select({ status: schema.leads.status, firstResponseAt: schema.leads.firstResponseAt }).from(schema.leads).where(eq(schema.leads.id, leadId));
  if (!lead || lead.status === to) return;
  const now = new Date();
  await db
    .update(schema.leads)
    .set({
      status: to,
      firstResponseAt: !lead.firstResponseAt && to !== "new" ? now : undefined,
      lastContactedAt: to === "contacted" ? now : undefined,
      closedAt: to === "closed" || to === "rejected" ? now : to === "new" ? null : undefined,
    })
    .where(eq(schema.leads.id, leadId));
  await addEvent(db, leadId, "status", { kind: "status", from: lead.status, to }, actor);
}

export async function addNote(leadId: string, body: string, actor: Actor) {
  const db = await getDb();
  await addEvent(db, leadId, "note", { kind: "note", body }, actor);
}

/* ---------------------------------------------------------------- quotes */

export async function createQuote(
  leadId: string,
  input: { amountPence: number; conditions?: string; internalNotes?: string; validDays?: number },
  actor: Actor,
) {
  const db = await getDb();
  const validDays = input.validDays ?? site.promises.offerValidDays;
  return db.transaction(async (tx) => {
    const [{ value: latest } = { value: 0 }] = await tx
      .select({ value: max(schema.quotes.version) })
      .from(schema.quotes)
      .where(eq(schema.quotes.leadId, leadId));
    const version = (latest ?? 0) + 1;
    // Any earlier live offer is replaced by the new one.
    await tx
      .update(schema.quotes)
      .set({ status: "superseded" })
      .where(and(eq(schema.quotes.leadId, leadId), inArray(schema.quotes.status, ["draft", "sent", "viewed"])));
    const [quote] = await tx
      .insert(schema.quotes)
      .values({
        leadId,
        version,
        amountPence: input.amountPence,
        conditions: input.conditions,
        internalNotes: input.internalNotes,
        validUntil: new Date(Date.now() + validDays * 86_400_000),
        tokenHash: sha256(randomToken()), // placeholder until the offer is sent
        createdBy: actor.id,
        createdByName: actor.name,
      })
      .returning();
    await addEvent(tx as unknown as Db, leadId, "quote", { kind: "quote", quoteId: quote!.id, version, amountPence: input.amountPence, action: "created" }, actor);
    return quote!;
  });
}

/** Issue a fresh offer-page token and mark the quote as sent. Returns the raw token for the link. */
export async function issueOfferToken(quoteId: string, channels: string[], actor: Actor) {
  const db = await getDb();
  const token = randomToken(24);
  const now = new Date();
  const [quote] = await db
    .update(schema.quotes)
    .set({ tokenHash: sha256(token), status: "sent", sentAt: now, sentVia: channels })
    .where(eq(schema.quotes.id, quoteId))
    .returning();
  if (!quote) throw new Error("Quote not found");
  const [lead] = await db.select({ status: schema.leads.status, firstResponseAt: schema.leads.firstResponseAt }).from(schema.leads).where(eq(schema.leads.id, quote.leadId));
  await db
    .update(schema.leads)
    .set({ status: lead?.status === "accepted" ? "accepted" : "quoted", firstResponseAt: lead?.firstResponseAt ?? now, lastContactedAt: now })
    .where(eq(schema.leads.id, quote.leadId));
  if (lead && lead.status !== "quoted" && lead.status !== "accepted") {
    await addEvent(db, quote.leadId, "status", { kind: "status", from: lead.status, to: "quoted" }, actor);
  }
  await addEvent(db, quote.leadId, "quote", { kind: "quote", quoteId, version: quote.version, amountPence: quote.amountPence, action: `sent via ${channels.join(" + ")}` }, actor);
  return { quote, token };
}

export async function findQuoteByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ quote: schema.quotes, lead: schema.leads })
    .from(schema.quotes)
    .innerJoin(schema.leads, eq(schema.leads.id, schema.quotes.leadId))
    .where(eq(schema.quotes.tokenHash, sha256(token)))
    .limit(1);
  return row ?? null;
}

export async function markOfferViewed(quoteId: string) {
  const db = await getDb();
  await db
    .update(schema.quotes)
    .set({ viewedAt: sql`COALESCE(${schema.quotes.viewedAt}, now())`, status: sql`CASE WHEN ${schema.quotes.status} = 'sent' THEN 'viewed'::quote_status ELSE ${schema.quotes.status} END` })
    .where(eq(schema.quotes.id, quoteId));
}

export type OfferResponse = "accept" | "decline";

export async function respondToOffer(token: string, response: OfferResponse, reason?: string) {
  const found = await findQuoteByToken(token);
  if (!found) return { ok: false as const, error: "not-found" as const };
  const { quote, lead } = found;
  if (!["sent", "viewed"].includes(quote.status)) return { ok: false as const, error: "closed" as const, quote, lead };
  if (quote.validUntil.getTime() < Date.now()) {
    const db = await getDb();
    await db.update(schema.quotes).set({ status: "expired" }).where(eq(schema.quotes.id, quote.id));
    return { ok: false as const, error: "expired" as const, quote, lead };
  }
  const db = await getDb();
  const now = new Date();
  const accepted = response === "accept";
  await db
    .update(schema.quotes)
    .set({ status: accepted ? "accepted" : "declined", respondedAt: now, declineReason: accepted ? null : reason?.slice(0, 500) })
    .where(and(eq(schema.quotes.id, quote.id), ne(schema.quotes.status, "superseded")));
  const to: LeadStatus = accepted ? "accepted" : "rejected";
  await db.update(schema.leads).set({ status: to, closedAt: accepted ? undefined : now }).where(eq(schema.leads.id, lead.id));
  const actor = { name: `${lead.fullName} (seller)` };
  await addEvent(db, lead.id, "quote", { kind: "quote", quoteId: quote.id, version: quote.version, amountPence: quote.amountPence, action: accepted ? "accepted by seller" : `declined by seller${reason ? `: ${reason}` : ""}` }, actor);
  await addEvent(db, lead.id, "status", { kind: "status", from: lead.status, to }, actor);
  return { ok: true as const, quote: { ...quote, status: accepted ? "accepted" : "declined" }, lead };
}

export async function latestQuotes(leadId: string) {
  const db = await getDb();
  return db.select().from(schema.quotes).where(eq(schema.quotes.leadId, leadId)).orderBy(desc(schema.quotes.version));
}

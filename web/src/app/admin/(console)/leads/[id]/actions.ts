"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { done, fail, formObject, invalid, type ActionState } from "@/lib/admin/action-state";
import { money, moneyExact, poundsToPence } from "@/lib/admin/format";
import { leadStatusMeta, LEAD_STATUSES } from "@/lib/admin/status";
import { requireAdmin } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db/client";
import type { Lead } from "@/lib/db/schema";
import { saveDraft, supersedeOthers } from "@/lib/admin/quotes";
import { addEvent, addNote, createQuote, issueOfferToken, updateLeadStatus } from "@/lib/leads/service";
import { deliverOffer } from "@/lib/notify";
import { audit } from "@/lib/security";

/**
 * Lead mutations. Each action re-checks the session, validates its input with
 * zod and confirms the lead exists before touching anything, then refreshes
 * the router so the page shows the new state.
 */

const leadId = z.uuid({ error: "This lead link isn't valid." });

async function findLead(id: string): Promise<Lead | null> {
  const db = await getDb();
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  return lead ?? null;
}

const MISSING = "This lead no longer exists. Refresh the page.";

/* ---------------------------------------------------------------- status */

const statusSchema = z.object({ leadId, status: z.enum(LEAD_STATUSES, { error: "Choose a status." }) });

export async function setLeadStatus(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = statusSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, "Choose a status.");
  const lead = await findLead(parsed.data.leadId);
  if (!lead) return fail(MISSING);
  const to = parsed.data.status;
  if (lead.status === to) return done();
  await updateLeadStatus(lead.id, to, { id: user.id, name: user.name });
  await audit("lead.status", { actorId: user.id, actorEmail: user.email, target: lead.id, detail: { from: lead.status, to } });
  refresh();
  return done(`Marked as ${leadStatusMeta[to].label.toLowerCase()}`);
}

/* ---------------------------------------------------------------- notes */

const noteSchema = z.object({
  leadId,
  body: z.string().trim().min(1, { error: "Write a note first." }).max(2000, { error: "Keep notes under 2,000 characters." }),
});

export async function addLeadNote(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = noteSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, parsed.error.issues[0]?.message);
  const lead = await findLead(parsed.data.leadId);
  if (!lead) return fail(MISSING);
  await addNote(lead.id, parsed.data.body, { id: user.id, name: user.name });
  await audit("lead.note", { actorId: user.id, actorEmail: user.email, target: lead.id });
  refresh();
  return done("Note added");
}

/* ---------------------------------------------------------------- quotes */

const pounds = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `Enter the ${label} in pounds.` })
    .transform((v, ctx) => {
      const pence = poundsToPence(v);
      if (pence === null) {
        ctx.addIssue({ code: "custom", message: `Enter the ${label} as a number, like 18,500.` });
        return z.NEVER;
      }
      return pence;
    })
    .refine((p) => p >= min * 100 && p <= max * 100, { error: `Enter an amount between £${min.toLocaleString("en-GB")} and £${max.toLocaleString("en-GB")}.` });

const channelList = z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []),
  z.array(z.enum(["email", "whatsapp"])).max(2),
);

const quoteSchema = z.object({
  leadId,
  draftId: z.union([z.uuid(), z.literal("")]).optional(),
  amount: pounds("offer", 100, 1_000_000),
  conditions: z.string().trim().max(2000, { error: "Keep the conditions under 2,000 characters." }),
  internalNotes: z.string().trim().max(2000, { error: "Keep internal notes under 2,000 characters." }),
  validDays: z.coerce.number({ error: "Enter how many days the offer stands." }).int().min(1, { error: "At least 1 day." }).max(30, { error: "No more than 30 days." }),
  intent: z.enum(["draft", "send"]),
  channels: channelList,
});

export type QuoteActionData = { outcome?: Record<string, string>; quoteId?: string };

/**
 * "Save draft" stores or updates a draft offer (createQuote, unless an offer is
 * still open with the seller: see saveDraft).
 * "Send offer" reuses the current draft when there is one (otherwise creates a
 * new version with createQuote), restarts its validity from now, supersedes
 * older open versions, issues the offer-page token and delivers it by the
 * chosen channels with deliverOffer.
 */
export async function saveOffer(_prev: ActionState<QuoteActionData> | null, formData: FormData): Promise<ActionState<QuoteActionData>> {
  const user = await requireAdmin();
  const parsed = quoteSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  if (input.intent === "send" && input.channels.length === 0) return fail("Choose how to send the offer.", { channels: "Tick email, WhatsApp or both." });

  const lead = await findLead(input.leadId);
  if (!lead) return fail(MISSING);
  const actor = { id: user.id, name: user.name };
  const db = await getDb();
  const validUntil = new Date(Date.now() + input.validDays * 86_400_000);
  const fields = { amountPence: input.amount, conditions: input.conditions || null, internalNotes: input.internalNotes || null, validUntil };

  // Reuse the draft only if it still is one and belongs to this lead.
  let quoteId: string | null = null;
  if (input.draftId) {
    const [draft] = await db
      .update(schema.quotes)
      .set(fields)
      .where(and(eq(schema.quotes.id, input.draftId), eq(schema.quotes.leadId, lead.id), eq(schema.quotes.status, "draft")))
      .returning();
    if (draft) {
      quoteId = draft.id;
      if (input.intent === "draft") {
        await addEvent(db, lead.id, "quote", { kind: "quote", quoteId: draft.id, version: draft.version, amountPence: draft.amountPence, action: "draft updated" }, actor);
      }
    }
  }
  if (!quoteId) {
    const draftInput = { amountPence: input.amount, conditions: fields.conditions, internalNotes: fields.internalNotes, validDays: input.validDays };
    const created =
      input.intent === "draft"
        ? await saveDraft(lead.id, draftInput, actor)
        : await createQuote(lead.id, { amountPence: input.amount, conditions: fields.conditions ?? undefined, internalNotes: fields.internalNotes ?? undefined, validDays: input.validDays }, actor);
    quoteId = created.id;
  }

  if (input.intent === "draft") {
    await audit("quote.draft", { actorId: user.id, actorEmail: user.email, target: lead.id, detail: { quoteId, amountPence: input.amount } });
    refresh();
    return done(`Draft saved at ${money(input.amount)}`, { quoteId });
  }

  await supersedeOthers(lead.id, quoteId);
  const { quote, token } = await issueOfferToken(quoteId, input.channels, actor);
  const outcome = await deliverOffer(lead, quote, token, input.channels, actor);
  await audit("quote.sent", { actorId: user.id, actorEmail: user.email, target: lead.id, detail: { quoteId, amountPence: quote.amountPence, channels: input.channels, outcome } });
  refresh();

  const failed = Object.entries(outcome).filter(([, s]) => s === "failed").map(([c]) => (c === "whatsapp" ? "WhatsApp" : "email"));
  const simulated = Object.entries(outcome).filter(([, s]) => s === "simulated").map(([c]) => (c === "whatsapp" ? "WhatsApp" : "email"));
  if (failed.length === input.channels.length) {
    return fail(`The offer is saved but couldn't be delivered by ${failed.join(" or ")}. Check the timeline, then try again or contact the seller directly.`);
  }
  const notes = [failed.length ? `${failed.join(" and ")} failed` : "", simulated.length ? `${simulated.join(" and ")} simulated` : ""].filter(Boolean).join("; ");
  return done(notes ? `Offer sent (${notes})` : "Offer sent", { outcome, quoteId });
}

/* ---------------------------------------------------------------- purchase */

const purchaseSchema = z.object({
  leadId,
  price: pounds("purchase price", 100, 1_000_000),
  note: z.string().trim().max(500, { error: "Keep the note under 500 characters." }).optional(),
});

/** Record what was actually paid and close the lead as a completed purchase. */
export async function recordPurchase(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = purchaseSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const lead = await findLead(parsed.data.leadId);
  if (!lead) return fail(MISSING);
  const actor = { id: user.id, name: user.name };
  const db = await getDb();
  const price = parsed.data.price;
  await db
    .update(schema.leads)
    .set({ purchasePricePence: price, closedAt: lead.closedAt ?? new Date() })
    .where(eq(schema.leads.id, lead.id));
  await updateLeadStatus(lead.id, "closed", actor);
  const verb = lead.purchasePricePence ? "updated" : "recorded";
  await addEvent(db, lead.id, "purchase", { kind: "system", body: `Purchase ${verb} at ${moneyExact(price)}.${parsed.data.note ? ` ${parsed.data.note}` : ""}` }, actor);
  await audit("lead.purchase", { actorId: user.id, actorEmail: user.email, target: lead.id, detail: { pricePence: price, previous: lead.purchasePricePence } });
  refresh();
  return done(`Purchase ${verb} at ${moneyExact(price)}`);
}

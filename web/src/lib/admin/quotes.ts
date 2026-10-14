import "server-only";

import { and, eq, inArray, max, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { Db } from "@/lib/db/client";
import { addEvent, createQuote } from "@/lib/leads/service";
import { randomToken, sha256 } from "@/lib/security";

type Actor = { id?: string; name?: string };
type DraftInput = { amountPence: number; conditions: string | null; internalNotes: string | null; validDays: number };

/**
 * Drafts must not disturb an offer the seller is looking at. createQuote()
 * supersedes every live version, which is right when nothing is live, but
 * would break the seller's link if a sent offer is still open. In that case
 * the draft is stored alongside it, and the older offer is superseded only
 * when the new version is actually sent (see supersedeOthers).
 */
export async function saveDraft(leadId: string, input: DraftInput, actor: Actor) {
  const db = await getDb();
  const live = await db
    .select({ id: schema.quotes.id })
    .from(schema.quotes)
    .where(and(eq(schema.quotes.leadId, leadId), inArray(schema.quotes.status, ["sent", "viewed"])))
    .limit(1);
  if (!live.length) {
    return createQuote(leadId, { amountPence: input.amountPence, conditions: input.conditions ?? undefined, internalNotes: input.internalNotes ?? undefined, validDays: input.validDays }, actor);
  }
  return db.transaction(async (tx) => {
    const [{ value: latest } = { value: 0 }] = await tx.select({ value: max(schema.quotes.version) }).from(schema.quotes).where(eq(schema.quotes.leadId, leadId));
    const version = (latest ?? 0) + 1;
    await tx.update(schema.quotes).set({ status: "superseded" }).where(and(eq(schema.quotes.leadId, leadId), eq(schema.quotes.status, "draft")));
    const [quote] = await tx
      .insert(schema.quotes)
      .values({
        leadId,
        version,
        amountPence: input.amountPence,
        conditions: input.conditions,
        internalNotes: input.internalNotes,
        validUntil: new Date(Date.now() + input.validDays * 86_400_000),
        tokenHash: sha256(randomToken()),
        createdBy: actor.id,
        createdByName: actor.name,
      })
      .returning();
    await addEvent(tx as unknown as Db, leadId, "quote", { kind: "quote", quoteId: quote!.id, version, amountPence: input.amountPence, action: "draft saved (earlier offer still open)" }, actor);
    return quote!;
  });
}

/** When a version is sent, every other open version of the offer stops being acceptable. */
export async function supersedeOthers(leadId: string, keepQuoteId: string) {
  const db = await getDb();
  await db
    .update(schema.quotes)
    .set({ status: "superseded" })
    .where(and(eq(schema.quotes.leadId, leadId), ne(schema.quotes.id, keepQuoteId), inArray(schema.quotes.status, ["draft", "sent", "viewed"])));
}

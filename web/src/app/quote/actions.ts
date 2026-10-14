"use server";

import { after } from "next/server";
import { z } from "zod";
import { quoteFormSchema } from "@/lib/leads/form-schema";
import { createLead } from "@/lib/leads/service";
import { notifyLeadReceived } from "@/lib/notify";
import { rateLimit, requestContext, verifyTurnstile } from "@/lib/security";

export type SubmitResult =
  | { ok: true; ref: string; category: string; contactPreference: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Quote submission. The browser has already validated each step, but nothing
 * from the client is trusted: the payload is re-validated, rate-limited and
 * checked for bots before a lead is created.
 */
export async function submitQuote(input: unknown): Promise<SubmitResult> {
  const parsed = quoteFormSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const fieldErrors = Object.fromEntries(Object.entries(flat.fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0] ?? "Check this answer"]));
    return { ok: false, message: "Some answers need another look.", fieldErrors };
  }
  const values = parsed.data;

  // Honeypot: real people never see or fill this field. Pretend success to bots.
  if (values.website) return { ok: true, ref: "GF-THANKS", category: values.category, contactPreference: values.contactPreference };

  const ctx = await requestContext();
  const [allowed, human] = await Promise.all([rateLimit(`quote:${ctx.ipHash}`, Number(process.env.QUOTE_RATE_LIMIT_PER_HOUR ?? 6), 60 * 60), verifyTurnstile(values.turnstileToken, ctx.ip)]);
  if (!allowed) return { ok: false, message: "You've sent several requests in a short time. Please call or WhatsApp us and we'll help straight away." };
  if (!human) return { ok: false, message: "We couldn't confirm you're not a robot. Please refresh the page and try again." };

  try {
    const lead = await createLead(values, ctx);
    // Emails and WhatsApp go out after the response, so the seller isn't kept waiting.
    after(() => notifyLeadReceived(lead.id, lead.photoCount));
    return { ok: true, ref: lead.ref, category: values.category, contactPreference: values.contactPreference };
  } catch (error) {
    console.error("[quote] submit failed", error);
    return { ok: false, message: "Something went wrong on our side. Your answers are saved — please try again in a moment." };
  }
}

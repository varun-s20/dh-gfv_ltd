"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { respondToOffer } from "@/lib/leads/service";
import { notifyOfferResponse } from "@/lib/notify";
import { rateLimit, requestContext } from "@/lib/security";

const input = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  response: z.enum(["accept", "decline"]),
  reason: z.string().trim().max(500).optional(),
});

export type OfferActionState = { error?: string };

/** Seller accepts or declines from the offer page. The token is the only credential. */
export async function respondAction(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  const parsed = input.safeParse({
    token: formData.get("token"),
    response: formData.get("response"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Something went wrong. Please refresh the page and try again." };

  const { ipHash } = await requestContext();
  if (!(await rateLimit(`offer:${ipHash}`, 20, 60 * 60))) return { error: "Too many attempts. Please call us and we'll sort it out." };

  const result = await respondToOffer(parsed.data.token, parsed.data.response, parsed.data.reason);
  if (!result.ok) {
    if (result.error === "expired") return { error: "This offer has expired. Reply to our message and we'll send you an up-to-date one." };
    if (result.error === "closed") return { error: "This offer has already been answered or replaced." };
    return { error: "We couldn't find this offer." };
  }
  const { lead, quote } = result;
  after(() => notifyOfferResponse(lead, { ...quote, status: quote.status as never }, parsed.data.response === "accept", parsed.data.reason));
  redirect(`/offer/${parsed.data.token}?done=${parsed.data.response}`);
}

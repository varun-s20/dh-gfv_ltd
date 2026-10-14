"use server";

import { z } from "zod";
import { adminRecipients } from "@/lib/notify";
import { sendEmail } from "@/lib/notify/providers";
import { rateLimit, requestContext } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name" }).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter an email address like name@example.com" })),
  phone: z.string().trim().max(40).optional(),
  topic: z.enum(["selling", "existing-offer", "fleet", "other"]).default("selling"),
  message: z.string().trim().min(10, { error: "Tell us a little more (at least 10 characters)" }).max(3000),
  website: z.string().max(0).optional(),
});

export type ContactState = { ok?: boolean; message?: string; errors?: Partial<Record<"name" | "email" | "message", string>>; values?: Record<string, string> };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const TOPICS: Record<string, string> = { selling: "Selling a vehicle", "existing-offer": "An offer I've received", fleet: "Fleet or several vehicles", other: "Something else" };

export async function sendEnquiry(_prev: ContactState, form: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(["name", "email", "phone", "topic", "message", "website"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = schema.safeParse({ ...raw, phone: raw.phone || undefined });
  if (!parsed.success) {
    const fe = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    return { errors: { name: fe.name?.[0], email: fe.email?.[0], message: fe.message?.[0] }, values: raw };
  }
  const v = parsed.data;
  if (v.website) return { ok: true };

  const { ipHash } = await requestContext();
  if (!(await rateLimit(`contact:${ipHash}`, 5, 60 * 60))) {
    return { message: "You've sent several messages already. Please call us instead.", values: raw };
  }

  const to = await adminRecipients();
  if (!to.length) {
    console.error("[contact] no admin recipients configured");
    return { message: "We couldn't send your message right now. Please call or WhatsApp us.", values: raw };
  }
  const subject = `Website enquiry: ${TOPICS[v.topic]} — ${v.name}`;
  const text = `${v.name} <${v.email}>${v.phone ? `, ${v.phone}` : ""}\nTopic: ${TOPICS[v.topic]}\n\n${v.message}`;
  const html = `<p><strong>${esc(v.name)}</strong> &lt;${esc(v.email)}&gt;${v.phone ? `, ${esc(v.phone)}` : ""}</p><p>Topic: ${esc(TOPICS[v.topic]!)}</p><p style="white-space:pre-wrap">${esc(v.message)}</p>`;
  const result = await sendEmail({ to, subject, html, text, replyTo: v.email, tag: "contact-enquiry" });
  if (!result.ok) return { message: "We couldn't send your message right now. Please call or WhatsApp us.", values: raw };
  return { ok: true };
}

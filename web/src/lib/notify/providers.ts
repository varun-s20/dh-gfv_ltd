import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type SendResult = { ok: true; providerId: string | null; simulated: boolean } | { ok: false; error: string };

/* ------------------------------------------------------------------ email */

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tag: string;
};

const emailFrom = () => process.env.EMAIL_FROM ?? "Green Future <offers@example.com>";

/** Postmark when POSTMARK_SERVER_TOKEN is set; otherwise writes to .data/outbox for review. */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const to = Array.isArray(message.to) ? message.to.join(",") : message.to;
  if (!token) return writeOutbox(`${message.tag}.html`, message.html, { to, subject: message.subject });

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: emailFrom(),
        To: to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        ReplyTo: message.replyTo,
        Tag: message.tag,
        MessageStream: process.env.POSTMARK_STREAM ?? "outbound",
        TrackOpens: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { MessageID?: string; Message?: string; ErrorCode?: number };
    if (!res.ok || (json.ErrorCode && json.ErrorCode !== 0)) {
      return { ok: false, error: json.Message ?? `Postmark error ${res.status}` };
    }
    return { ok: true, providerId: json.MessageID ?? null, simulated: false };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email send failed" };
  }
}

/* ------------------------------------------------------------------ whatsapp */

export type WhatsAppTemplate = {
  to: string; // E.164 with or without +
  template: string;
  language?: string;
  body: string[];
  /** Dynamic suffix for a URL button defined in the approved template. */
  urlButtonSuffix?: string;
  /** Plain-text rendering kept for the timeline and the dev outbox. */
  preview: string;
};

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** Meta WhatsApp Cloud API. Requires business verification and approved templates. */
export async function sendWhatsAppTemplate(msg: WhatsAppTemplate): Promise<SendResult> {
  if (!whatsappConfigured()) {
    return writeOutbox(`whatsapp-${msg.template}.txt`, msg.preview, { to: msg.to, template: msg.template });
  }
  const version = process.env.WHATSAPP_API_VERSION ?? "v23.0";
  const components: unknown[] = [
    { type: "body", parameters: msg.body.map((text) => ({ type: "text", text })) },
  ];
  if (msg.urlButtonSuffix) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: msg.urlButtonSuffix }] });
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: msg.to.replace(/^\+/, ""),
        type: "template",
        template: { name: msg.template, language: { code: msg.language ?? "en_GB" }, components },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string; code?: number };
    };
    if (!res.ok || json.error) return { ok: false, error: json.error?.message ?? `WhatsApp error ${res.status}` };
    return { ok: true, providerId: json.messages?.[0]?.id ?? null, simulated: false };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "WhatsApp send failed" };
  }
}

/* ------------------------------------------------------------------ dev outbox */

async function writeOutbox(name: string, body: string, meta: Record<string, string>): Promise<SendResult> {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATED_MESSAGES !== "true") {
    return { ok: false, error: "Messaging provider is not configured" };
  }
  try {
    const dir = path.join(process.cwd(), ".data", "outbox");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const header = Object.entries(meta)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const content = name.endsWith(".html") ? `<!--\n${header}\n-->\n${body}` : `${header}\n\n${body}`;
    await writeFile(path.join(dir, `${stamp}-${name}`), content, "utf8");
  } catch (error) {
    console.warn("[outbox] could not write", error);
  }
  console.info(`[outbox] simulated ${name} → ${meta.to}`);
  return { ok: true, providerId: null, simulated: true };
}

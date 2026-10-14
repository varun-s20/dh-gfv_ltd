/**
 * WhatsApp Cloud API webhook helpers (pure, no framework imports, unit-tested).
 * Meta signs every POST with HMAC-SHA256 of the raw body using the app secret
 * and sends it as `X-Hub-Signature-256: sha256=<hex>`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function hubSignature(rawBody: string | Uint8Array, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

/** Timing-safe check of the signature header against the raw request body. */
export function verifyHubSignature(rawBody: string | Uint8Array, header: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const received = header.trim();
  if (!/^sha256=[0-9a-f]{64}$/i.test(received)) return false;
  const expected = Buffer.from(hubSignature(rawBody, secret), "utf8");
  const actual = Buffer.from(`sha256=${received.slice(7).toLowerCase()}`, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ---------------------------------------------------------------- payload */

const statusSchema = z.object({
  id: z.string().min(1).max(256),
  status: z.string().max(32),
  timestamp: z.string().optional(),
  recipient_id: z.string().optional(),
  errors: z.array(z.object({ code: z.number().optional(), title: z.string().optional(), message: z.string().optional() })).optional(),
});

const inboundSchema = z.object({
  id: z.string().min(1).max(256),
  from: z.string().min(5).max(32),
  timestamp: z.string().optional(),
  type: z.string().max(32),
  text: z.object({ body: z.string() }).optional(),
  button: z.object({ text: z.string().optional() }).optional(),
  interactive: z.unknown().optional(),
});

const payloadSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              field: z.string().optional(),
              value: z
                .object({
                  statuses: z.array(z.unknown()).optional(),
                  messages: z.array(z.unknown()).optional(),
                  contacts: z.array(z.object({ wa_id: z.string().optional(), profile: z.object({ name: z.string().optional() }).optional() })).optional(),
                })
                .optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

export type DeliveryStatus = "sent" | "delivered" | "read" | "failed";
export type StatusUpdate = { providerId: string; status: DeliveryStatus; error?: string; at?: Date };
export type InboundMessage = { providerId: string; from: string; name?: string; text: string; at?: Date };

const DELIVERY: readonly string[] = ["sent", "delivered", "read", "failed"];

const fromUnix = (ts?: string) => {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : undefined;
};

/** Pull the status updates and inbound messages we care about out of a webhook body. Unknown shapes are ignored. */
export function parseWebhook(body: unknown): { statuses: StatusUpdate[]; inbound: InboundMessage[] } {
  const parsed = payloadSchema.safeParse(body);
  const statuses: StatusUpdate[] = [];
  const inbound: InboundMessage[] = [];
  if (!parsed.success) return { statuses, inbound };
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;
      for (const raw of value.statuses ?? []) {
        const s = statusSchema.safeParse(raw);
        if (!s.success || !DELIVERY.includes(s.data.status)) continue;
        const err = s.data.errors?.[0];
        statuses.push({
          providerId: s.data.id,
          status: s.data.status as DeliveryStatus,
          error: err ? [err.code, err.title ?? err.message].filter(Boolean).join(" ").slice(0, 300) : undefined,
          at: fromUnix(s.data.timestamp),
        });
      }
      for (const raw of value.messages ?? []) {
        const m = inboundSchema.safeParse(raw);
        if (!m.success) continue;
        const contact = value.contacts?.find((c) => c.wa_id === m.data.from) ?? value.contacts?.[0];
        const text = m.data.text?.body ?? m.data.button?.text ?? `[${m.data.type} message]`;
        inbound.push({ providerId: m.data.id, from: m.data.from.replace(/\D/g, ""), name: contact?.profile?.name, text: text.slice(0, 2000), at: fromUnix(m.data.timestamp) });
      }
    }
  }
  return { statuses, inbound };
}

/**
 * Webhooks can arrive out of order ("delivered" after "read"). Only move a
 * message forward; "failed" always wins because it needs attention.
 */
const RANK: Record<string, number> = { queued: 0, simulated: 0, sent: 1, delivered: 2, read: 3 };
export function nextMessageStatus(current: string, incoming: DeliveryStatus): string {
  if (incoming === "failed") return "failed";
  if (current === "failed") return current;
  return (RANK[incoming] ?? 0) > (RANK[current] ?? 0) ? incoming : current;
}

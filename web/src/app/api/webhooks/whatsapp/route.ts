import { desc, eq } from "drizzle-orm";
import { nextMessageStatus, parseWebhook, verifyHubSignature } from "@/lib/admin/whatsapp";
import { getDb, schema } from "@/lib/db/client";
import { addEvent } from "@/lib/leads/service";
import { rateLimit, safeEqual } from "@/lib/security";

const text = (body: string, status: number) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * Meta webhook verification handshake:
 * GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… → echo the challenge.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") === "subscribe" && expected && token && safeEqual(token, expected) && challenge && /^[A-Za-z0-9_-]{1,256}$/.test(challenge)) {
    return text(challenge, 200);
  }
  return text("Forbidden", 403);
}

/**
 * Delivery receipts and inbound messages.
 * The X-Hub-Signature-256 HMAC is checked against the exact raw bytes before
 * anything is parsed. Status updates move messages.status forward by
 * provider id; an inbound message from a seller's number is added to their
 * lead's timeline. Meta retries on non-2xx, so duplicates are ignored.
 */
export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return text("Webhook not configured", 503);

  const raw = new Uint8Array(await request.arrayBuffer());
  if (!verifyHubSignature(raw, request.headers.get("x-hub-signature-256"), secret)) return text("Invalid signature", 401);

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return text("Invalid JSON", 400);
  }

  const { statuses, inbound } = parseWebhook(payload);
  const db = await getDb();

  for (const update of statuses) {
    const rows = await db
      .select({ id: schema.messages.id, status: schema.messages.status, error: schema.messages.error })
      .from(schema.messages)
      .where(eq(schema.messages.providerId, update.providerId));
    for (const message of rows) {
      const next = nextMessageStatus(message.status, update.status);
      if (next === message.status) continue;
      await db
        .update(schema.messages)
        .set({ status: next as typeof message.status, error: next === "failed" ? (update.error ?? "Delivery failed") : message.error })
        .where(eq(schema.messages.id, message.id));
    }
  }

  for (const message of inbound) {
    // Meta redelivers on timeouts: record each inbound message once.
    if (!(await rateLimit(`wa-inbound:${message.providerId}`, 1, 7 * 24 * 60 * 60))) continue;
    const [lead] = await db
      .select({ id: schema.leads.id, fullName: schema.leads.fullName })
      .from(schema.leads)
      .where(eq(schema.leads.phone, `+${message.from}`))
      .orderBy(desc(schema.leads.createdAt))
      .limit(1);
    if (!lead) continue;
    await addEvent(db, lead.id, "whatsapp-inbound", { kind: "system", body: message.text }, { name: message.name ?? lead.fullName });
  }

  return text("OK", 200);
}

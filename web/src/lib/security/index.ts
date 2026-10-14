import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "@/lib/db/client";

/** Server secret used for HMACs (upload receipts, IP hashing). */
export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set to at least 32 characters in production.");
  }
  return "development-only-secret-change-me-0123456789";
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmac = (value: string) => createHmac("sha256", appSecret()).update(value).digest("base64url");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Unambiguous reference like GF-7K3Q9 (no 0/O/1/I). */
export function leadReference() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(5);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `GF-${out}`;
}

/** Client IP from the platform's forwarding headers; hashed before storage. */
export async function requestContext() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return {
    ip,
    ipHash: hmac(`ip:${ip}`).slice(0, 32),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    origin: h.get("origin"),
    host: h.get("x-forwarded-host") ?? h.get("host"),
  };
}

/** Reject cross-site POSTs to route handlers (Server Actions check this themselves). */
export async function assertSameOrigin() {
  const { origin, host } = await requestContext();
  if (!origin || !host) return;
  try {
    if (new URL(origin).host !== host) throw new Error("cross-origin");
  } catch {
    throw new Response("Forbidden", { status: 403 });
  }
}

/**
 * Fixed-window rate limit stored in Postgres, so it holds across serverless
 * instances. Returns false when the caller is over the limit.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN ${resetAt.toISOString()}::timestamptz ELSE ${schema.rateLimits.resetAt} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return (row?.count ?? 0) <= limit;
}

export async function clearRateLimit(key: string) {
  const db = await getDb();
  await db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, key));
}

/** Cloudflare Turnstile verification; passes automatically when not configured. */
export async function verifyTurnstile(token: string | undefined | null, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function audit(action: string, opts: { actorId?: string; actorEmail?: string; target?: string; detail?: Record<string, unknown> } = {}) {
  try {
    const db = await getDb();
    const { ipHash } = await requestContext();
    await db.insert(schema.auditLog).values({ action, ipHash, ...opts });
  } catch (error) {
    console.error("[audit] failed to record", action, error);
  }
}

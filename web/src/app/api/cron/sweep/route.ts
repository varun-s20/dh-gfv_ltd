import { inArray, lt } from "drizzle-orm";
import { json } from "@/lib/admin/api";
import { getDb, schema } from "@/lib/db/client";
import { safeEqual } from "@/lib/security";
import { storage } from "@/lib/storage";

/**
 * Daily housekeeping, called by the scheduler with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends exactly that).
 * - Deletes photo uploads that were never attached to a lead within 24 hours.
 * - Clears expired admin sessions and stale rate-limit counters.
 */
async function sweep(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !safeEqual(auth, `Bearer ${secret}`)) return json({ error: "Unauthorized" }, 401);

  const db = await getDb();
  const now = Date.now();
  const cutoff = new Date(now - 24 * 60 * 60 * 1000);

  const stale = await db.select().from(schema.pendingUploads).where(lt(schema.pendingUploads.createdAt, cutoff)).limit(2000);
  const removed: string[] = [];
  let failed = 0;
  for (const upload of stale) {
    try {
      await storage().remove(upload.storageKey);
      removed.push(upload.id);
    } catch (error) {
      failed++;
      console.error("[cron/sweep] could not delete", upload.storageKey, error);
    }
  }
  if (removed.length) await db.delete(schema.pendingUploads).where(inArray(schema.pendingUploads.id, removed));

  const sessions = await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date(now))).returning({ id: schema.sessions.id });
  const limits = await db.delete(schema.rateLimits).where(lt(schema.rateLimits.resetAt, new Date(now - 60 * 60 * 1000))).returning({ key: schema.rateLimits.key });

  return json({ ok: true, uploadsRemoved: removed.length, uploadsFailed: failed, expiredSessions: sessions.length, rateLimitsCleared: limits.length });
}

export const GET = sweep;
export const POST = sweep;

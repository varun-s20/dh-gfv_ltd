/**
 * Delete photos that were uploaded but never attached to a submitted lead.
 * Schedule daily (e.g. Vercel Cron → /api/cron/sweep, or run this script).
 */
import { lt } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db/client";
import { storage } from "../src/lib/storage";

async function main() {
  const db = await getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db.select().from(schema.pendingUploads).where(lt(schema.pendingUploads.createdAt, cutoff));
  for (const upload of stale) await storage().remove(upload.storageKey);
  await db.delete(schema.pendingUploads).where(lt(schema.pendingUploads.createdAt, cutoff));
  console.log(`Removed ${stale.length} unattached upload(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

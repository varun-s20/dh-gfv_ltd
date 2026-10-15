import "server-only";

import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "./password";

/**
 * An owner login that comes from environment settings instead of a database
 * row, so a preview deployment can be signed in to with no setup step.
 *
 *   ADMIN_EMAIL=danny@example.com
 *   ADMIN_PASSWORD=at-least-12-characters
 *   ADMIN_NAME="Danny Pope"          (optional)
 *
 * It runs only when someone submits exactly that email and password, so it
 * adds no new way in: the account is created (or its password refreshed) and
 * the normal sign-in carries on from there, with the same rate limits,
 * sessions and two-step code if the owner switches it on. A disabled account
 * stays disabled.
 */
export async function ensureEnvAdmin(email: string, password: string) {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envEmail || !envPassword || envPassword.length < 12 || email !== envEmail) return;

  const given = Buffer.from(password);
  const wanted = Buffer.from(envPassword);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return;

  const db = await getDb();
  const [existing] = await db
    .select({ id: schema.adminUsers.id, passwordHash: schema.adminUsers.passwordHash, disabled: schema.adminUsers.disabled })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, envEmail))
    .limit(1);

  if (!existing) {
    const name = process.env.ADMIN_NAME?.trim() || envEmail.split("@")[0]!;
    await db.insert(schema.adminUsers).values({ email: envEmail, name, role: "owner", passwordHash: await hashPassword(envPassword) });
    return;
  }
  if (!existing.disabled && !(await verifyPassword(existing.passwordHash, envPassword))) {
    await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(envPassword) }).where(eq(schema.adminUsers.id, existing.id));
  }
}

/**
 * Create or reset an admin login.
 *   npm run admin:create -- --email danny@example.com --name "Danny Pope" --role owner
 * The password comes from ADMIN_PASSWORD, or a strong one is generated and printed once.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || email?.split("@")[0];
  const role = arg("role") === "staff" ? "staff" : "owner";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Pass --email you@example.com");

  const password = process.env.ADMIN_PASSWORD || randomBytes(15).toString("base64url");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  const passwordHash = await hashPassword(password);

  const db = await getDb();
  const [existing] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  if (existing) {
    await db.update(schema.adminUsers).set({ passwordHash, name: name!, role, disabled: false }).where(eq(schema.adminUsers.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    console.log(`Reset password for ${email} (${role}).`);
  } else {
    await db.insert(schema.adminUsers).values({ email, name: name!, role, passwordHash });
    console.log(`Created ${role} ${email}.`);
  }
  if (!process.env.ADMIN_PASSWORD) console.log(`Temporary password: ${password}\nChange it after first sign-in.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

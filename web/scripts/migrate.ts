/**
 * Apply SQL migrations in ./drizzle.
 *   DATABASE_URL set   → production/staging Postgres
 *   DATABASE_URL unset → local embedded PGlite (.data/pglite)
 * Run: npm run db:migrate
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1, prepare: false });
    await migrate(drizzle(client), { migrationsFolder });
    await client.end();
    console.log("Migrations applied to DATABASE_URL.");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dataDir = process.env.PGLITE_DIR ? path.resolve(process.env.PGLITE_DIR) : path.join(process.cwd(), ".data", "pglite");
    mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await migrate(drizzle(client), { migrationsFolder });
    await client.close();
    console.log("Migrations applied to local PGlite (.data/pglite).");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

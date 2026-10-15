import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * One database handle per server process.
 *
 * - DATABASE_URL set  → Postgres via postgres-js (Supabase, Neon, RDS…).
 * - DATABASE_URL unset → embedded Postgres (PGlite) under .data/pglite, so a new
 *   developer can run the whole platform with zero setup. Migrations are applied
 *   automatically in that mode; production runs `npm run db:migrate`.
 */
export type Db = PostgresJsDatabase<typeof schema>;

type Holder = { db?: Promise<Db> };
const holder = globalThis as typeof globalThis & { __gfDb?: Holder };
holder.__gfDb ??= {};

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const [{ default: postgres }, { drizzle }] = await Promise.all([import("postgres"), import("drizzle-orm/postgres-js")]);
    const client = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      prepare: false, // Required for transaction-mode poolers (Supabase pgbouncer / Neon).
      idle_timeout: 20,
    });
    return drizzle(client, { schema, casing: "snake_case" });
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  // `next build` prerenders in parallel workers. PGlite is single-process, so a
  // shared data directory would be opened concurrently and corrupted; give each
  // build worker a throwaway in-memory database instead (pages fall back to defaults).
  const building = process.env.NEXT_PHASE === "phase-production-build";
  // Vercel's deployed code is read-only; /tmp is the only place a function may write. Data there is temporary
  // (it resets when the instance restarts), so this is for previews only: set DATABASE_URL for a real launch.
  const dataDir = process.env.PGLITE_DIR
    ? path.resolve(process.env.PGLITE_DIR)
    : process.env.VERCEL
      ? "/tmp/gf-pglite"
      : path.join(process.cwd(), ".data", "pglite");
  if (!building) mkdirSync(dataDir, { recursive: true });
  const client = building ? new PGlite() : new PGlite(dataDir);
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  holder.__gfDb!.db ??= connect().catch((error) => {
    holder.__gfDb!.db = undefined;
    throw error;
  });
  return holder.__gfDb!.db;
}

export { schema };

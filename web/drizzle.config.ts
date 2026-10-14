import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : { url: "postgres://localhost:5432/unused" },
  strict: true,
  verbose: true,
});

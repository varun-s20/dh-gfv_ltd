import "server-only";

import { connection } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth/session";

/**
 * Page/component guard for admin Server Components.
 *
 * The session check compares timestamps (idle and absolute expiry) and every
 * admin read is live data, so it must run at request time. `connection()`
 * tells Cache Components that explicitly; without it, the session-aware App
 * Shell prerender trips over `new Date()` inside getSession(). Callers sit
 * inside a Suspense boundary (loading.tsx or an explicit <Suspense>).
 *
 * Server Actions and route handlers already run at request time and call
 * requireAdmin()/adminForApi() directly.
 */
export async function requireAdminPage(opts: { role?: "owner" } = {}) {
  await connection();
  return requireAdmin(opts);
}

/** Request-time session lookup for the sign-in pages (no redirect). */
export async function currentSession() {
  await connection();
  return getSession();
}

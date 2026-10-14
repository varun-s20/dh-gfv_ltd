import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/lib/db/client";
import { randomToken, requestContext, sha256 } from "@/lib/security";

export { burnPasswordCheck, hashPassword, verifyPassword } from "./password";

const isProd = process.env.NODE_ENV === "production";
/** __Host- prefix pins the cookie to this origin over HTTPS; plain name for local http. */
export const SESSION_COOKIE = isProd ? "__Host-gf_admin" : "gf_admin";

const IDLE_MS = 8 * 60 * 60 * 1000; // sign out after 8 hours of inactivity
const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000; // and after 7 days regardless
const TOUCH_EVERY_MS = 10 * 60 * 1000;

export type AdminSession = {
  sessionId: string;
  mfaPassed: boolean;
  user: { id: string; email: string; name: string; role: "owner" | "staff"; totpEnabled: boolean };
};

export async function createSession(userId: string, mfaPassed: boolean) {
  const db = await getDb();
  const token = randomToken(32);
  const { ipHash, userAgent } = await requestContext();
  const now = Date.now();
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId,
    mfaPassed,
    expiresAt: new Date(now + IDLE_MS),
    ipHash,
    userAgent,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
  });
}

export async function markMfaPassed(sessionId: string) {
  const db = await getDb();
  await db.update(schema.sessions).set({ mfaPassed: true }).where(eq(schema.sessions.id, sessionId));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsFor(userId: string) {
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Per-request session lookup (deduplicated with React.cache). */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const id = sha256(token);
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      mfaPassed: schema.sessions.mfaPassed,
      lastSeenAt: schema.sessions.lastSeenAt,
      createdAt: schema.sessions.createdAt,
      userId: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.role,
      totpEnabled: schema.adminUsers.totpEnabled,
      disabled: schema.adminUsers.disabled,
    })
    .from(schema.sessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  if (!row || row.disabled || now.getTime() - row.createdAt.getTime() > ABSOLUTE_MS) return null;

  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + IDLE_MS) })
      .where(eq(schema.sessions.id, id));
  }

  return {
    sessionId: row.sessionId,
    mfaPassed: row.mfaPassed,
    user: { id: row.userId, email: row.email, name: row.name, role: row.role, totpEnabled: row.totpEnabled },
  };
});

/**
 * Data Access Layer guard. Every admin page, Server Action and route handler
 * calls this; the proxy's cookie check is only an optimistic redirect.
 */
export async function requireAdmin(opts: { role?: "owner" } = {}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.user.totpEnabled && !session.mfaPassed) redirect("/admin/login/verify");
  if (opts.role === "owner" && session.user.role !== "owner") redirect("/admin");
  return session.user;
}

/** Same guard for route handlers, which must answer with a status instead of redirecting. */
export async function adminForApi() {
  const session = await getSession();
  if (!session || (session.user.totpEnabled && !session.mfaPassed)) return null;
  return session.user;
}

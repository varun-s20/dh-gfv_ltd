"use server";

import { eq } from "drizzle-orm";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionState } from "@/lib/admin/action-state";
import { safeNextPath } from "@/lib/admin/next-path";
import { burnPasswordCheck, createSession, destroySession, getSession, markMfaPassed, verifyPassword } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { getDb, schema } from "@/lib/db/client";
import { audit, clearRateLimit, rateLimit, requestContext, sha256 } from "@/lib/security";

const WINDOW_SECONDS = 15 * 60;
const GENERIC = "That email and password don't match an active account.";
const LOCKED = "Too many attempts. Wait 15 minutes, then try again.";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(256),
  next: z.string().max(500).optional(),
});

/**
 * Email + password sign-in.
 * - 5 attempts per 15 minutes per (IP hash, email), plus a looser per-IP cap.
 * - Unknown or disabled accounts still run a full Argon2 verification so the
 *   response time doesn't reveal which emails exist.
 * - One generic message for every failure.
 */
export async function signIn(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return fail("Enter your email address and password.");
  const { email, password } = parsed.data;
  const next = safeNextPath(parsed.data.next);

  const { ipHash } = await requestContext();
  const key = `admin-login:${ipHash}:${sha256(email)}`;
  const [allowed, ipAllowed] = await Promise.all([rateLimit(key, 5, WINDOW_SECONDS), rateLimit(`admin-login-ip:${ipHash}`, 40, WINDOW_SECONDS)]);
  if (!allowed || !ipAllowed) {
    await burnPasswordCheck(password);
    await audit("admin.login.locked", { actorEmail: email, detail: { scope: allowed ? "ip" : "account" } });
    return fail(LOCKED);
  }

  const db = await getDb();
  const [user] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email, passwordHash: schema.adminUsers.passwordHash, disabled: schema.adminUsers.disabled, totpEnabled: schema.adminUsers.totpEnabled })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1);

  const passwordOk = user && !user.disabled ? await verifyPassword(user.passwordHash, password) : await burnPasswordCheck(password);
  if (!user || user.disabled || !passwordOk) {
    await audit("admin.login.failed", { actorId: user?.id, actorEmail: email, detail: { reason: !user ? "unknown-email" : user.disabled ? "disabled" : "password" } });
    return fail(GENERIC);
  }

  await clearRateLimit(key);
  // Never carry an old session over a sign-in (session fixation).
  await destroySession();
  await createSession(user.id, !user.totpEnabled);

  if (user.totpEnabled) {
    await audit("admin.login.password-ok", { actorId: user.id, actorEmail: user.email });
    redirect(`/admin/login/verify?next=${encodeURIComponent(next)}` as Route);
  }
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, user.id));
  await audit("admin.login", { actorId: user.id, actorEmail: user.email, detail: { mfa: false } });
  redirect(next as Route);
}

const codeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code from your authenticator app." })),
  next: z.string().max(500).optional(),
});

/** Second step for accounts with two-step verification. */
export async function verifySignInCode(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const parsed = codeSchema.safeParse({ code: formData.get("code") ?? "", next: formData.get("next") ?? undefined });
  const next = safeNextPath(parsed.success ? parsed.data.next : undefined);
  if (!session.user.totpEnabled || session.mfaPassed) redirect(next as Route);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");

  const { id: userId, email } = session.user;
  if (!(await rateLimit(`admin-mfa:${session.sessionId}`, 5, WINDOW_SECONDS))) {
    await audit("admin.mfa.locked", { actorId: userId, actorEmail: email });
    await destroySession();
    redirect("/admin/login?reason=locked" as Route);
  }

  const db = await getDb();
  const [row] = await db.select({ secret: schema.adminUsers.totpSecret }).from(schema.adminUsers).where(eq(schema.adminUsers.id, userId));
  if (!row?.secret || !verifyTotp(row.secret, parsed.data.code)) {
    await audit("admin.mfa.failed", { actorId: userId, actorEmail: email });
    return fail("That code didn't work. Check your phone's clock and use the newest code.");
  }
  // Each code works once: a captured code can't be replayed inside its 90-second window.
  if (!(await rateLimit(`admin-totp-used:${userId}:${parsed.data.code}`, 1, 120))) {
    return fail("That code has already been used. Wait for the next one.");
  }

  await markMfaPassed(session.sessionId);
  await clearRateLimit(`admin-mfa:${session.sessionId}`);
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, userId));
  await audit("admin.login", { actorId: userId, actorEmail: email, detail: { mfa: true } });
  redirect(next as Route);
}

"use server";

import { randomInt } from "node:crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { done, fail, formObject, invalid, type ActionState } from "@/lib/admin/action-state";
import { putSetting } from "@/lib/admin/settings";
import { destroyAllSessionsFor, getSession, hashPassword, requireAdmin, verifyPassword } from "@/lib/auth/session";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { getDb, schema } from "@/lib/db/client";
import { audit, rateLimit } from "@/lib/security";

const MIN_PASSWORD = 12;
const WINDOW = 15 * 60;

type Actor = Awaited<ReturnType<typeof requireAdmin>>;
const who = (u: Actor) => ({ actorId: u.id, actorEmail: u.email });

/* ================================================================ business settings (owner) */

const emailList = z
  .string()
  .max(4000)
  .transform((v) => [...new Set(v.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))])
  .pipe(z.array(z.email({ error: "One of those isn't a valid email address." })).max(20, { error: "Up to 20 addresses." }));

export async function saveNotificationEmails(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin({ role: "owner" });
  const parsed = z.object({ emails: emailList }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, parsed.error.issues[0]?.message);
  await putSetting("notify.emails", parsed.data.emails);
  await audit("settings.update", { ...who(user), target: "notify.emails", detail: { count: parsed.data.emails.length } });
  refresh();
  return done(parsed.data.emails.length ? "Alert recipients saved" : "Alerts now go to the default address only");
}

const quoteDefaultsSchema = z.object({
  conditions: z.string().trim().max(2000, { error: "Keep the conditions under 2,000 characters." }),
  validDays: z.coerce.number({ error: "Enter a number of days." }).int({ error: "Whole days only." }).min(1, { error: "At least 1 day." }).max(30, { error: "No more than 30 days." }),
});

export async function saveQuoteDefaults(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin({ role: "owner" });
  const parsed = quoteDefaultsSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await putSetting("quote.defaults", parsed.data);
  await audit("settings.update", { ...who(user), target: "quote.defaults", detail: { validDays: parsed.data.validDays } });
  refresh();
  return done("Offer defaults saved");
}

const adsSchema = z.object({
  conversionName: z.string().trim().min(1, { error: "Enter the conversion name exactly as it appears in Google Ads." }).max(100, { error: "Up to 100 characters." }),
});

export async function saveAdsSettings(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin({ role: "owner" });
  const parsed = adsSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await putSetting("ads.conversionName", parsed.data.conversionName);
  await audit("settings.update", { ...who(user), target: "ads.conversionName", detail: { value: parsed.data.conversionName } });
  refresh();
  return done("Conversion name saved");
}

/* ================================================================ my account */

const newPassword = z
  .string()
  .min(MIN_PASSWORD, { error: `Use at least ${MIN_PASSWORD} characters.` })
  .max(200, { error: "That's too long." });

const passwordSchema = z
  .object({ current: z.string().min(1, { error: "Enter your current password." }).max(200), next: newPassword, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], error: "The two new passwords don't match." })
  .refine((v) => v.next !== v.current, { path: ["next"], error: "Choose a password you haven't used here." });

/** Change my password (current password required). Signs out every other device. */
export async function changePassword(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = passwordSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit(`admin-pw:${user.id}`, 5, WINDOW))) return fail("Too many attempts. Try again in 15 minutes.");
  if (parsed.data.next.toLowerCase().includes(user.email.split("@")[0]!.toLowerCase())) {
    return fail("Check the highlighted fields.", { next: "Don't include your email name in the password." });
  }

  const db = await getDb();
  const [row] = await db.select({ hash: schema.adminUsers.passwordHash }).from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id));
  if (!row || !(await verifyPassword(row.hash, parsed.data.current))) {
    await audit("account.password.failed", who(user));
    return fail("Check the highlighted fields.", { current: "That isn't your current password." });
  }
  await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(parsed.data.next) }).where(eq(schema.adminUsers.id, user.id));
  const signedOut = await signOutOtherSessions(user.id);
  await audit("account.password", { ...who(user), detail: { otherSessionsEnded: signedOut } });
  refresh();
  return done(signedOut ? `Password changed. ${signedOut} other ${signedOut === 1 ? "device was" : "devices were"} signed out.` : "Password changed");
}

async function signOutOtherSessions(userId: string) {
  const session = await getSession();
  const db = await getDb();
  const removed = await db
    .delete(schema.sessions)
    .where(session ? and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, session.sessionId)) : eq(schema.sessions.userId, userId))
    .returning({ id: schema.sessions.id });
  return removed.length;
}

export async function signOutOtherDevices(): Promise<ActionState> {
  const user = await requireAdmin();
  const n = await signOutOtherSessions(user.id);
  await audit("account.sessions.revoke", { ...who(user), detail: { count: n } });
  refresh();
  return done(n ? `Signed out ${n} other ${n === 1 ? "device" : "devices"}` : "No other devices were signed in");
}

/* ---------------------------------------------------------------- two-step verification */

/** Step 1: create a pending secret. The QR code is rendered by the settings page until it's confirmed. */
export async function startTotpSetup(): Promise<ActionState> {
  const user = await requireAdmin();
  if (user.totpEnabled) return fail("Two-step verification is already on.");
  const db = await getDb();
  await db.update(schema.adminUsers).set({ totpSecret: generateTotpSecret() }).where(and(eq(schema.adminUsers.id, user.id), eq(schema.adminUsers.totpEnabled, false)));
  await audit("account.totp.setup", who(user));
  refresh();
  return done("Scan the code with your authenticator app");
}

const codeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code from the app." })),
});

/** Step 2: prove the app works before switching it on. */
export async function confirmTotpSetup(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = codeSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, parsed.error.issues[0]?.message);
  if (!(await rateLimit(`admin-totp-setup:${user.id}`, 8, WINDOW))) return fail("Too many attempts. Try again in 15 minutes.");
  const db = await getDb();
  const [row] = await db.select({ secret: schema.adminUsers.totpSecret, enabled: schema.adminUsers.totpEnabled }).from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id));
  if (!row?.secret || row.enabled) return fail("Start the set-up again.");
  if (!verifyTotp(row.secret, parsed.data.code)) return fail("That code didn't match.", { code: "That code didn't match. Check your phone's clock and try the newest code." });
  await rateLimit(`admin-totp-used:${user.id}:${parsed.data.code}`, 1, 120);
  await db.update(schema.adminUsers).set({ totpEnabled: true }).where(eq(schema.adminUsers.id, user.id));
  await audit("account.totp.enable", who(user));
  refresh();
  return done("Two-step verification is on");
}

export async function cancelTotpSetup(): Promise<ActionState> {
  const user = await requireAdmin();
  const db = await getDb();
  await db.update(schema.adminUsers).set({ totpSecret: null }).where(and(eq(schema.adminUsers.id, user.id), eq(schema.adminUsers.totpEnabled, false)));
  refresh();
  return done("Set-up cancelled");
}

export async function disableTotp(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = z.object({ password: z.string().min(1, { error: "Enter your password to confirm." }).max(200) }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit(`admin-pw:${user.id}`, 5, WINDOW))) return fail("Too many attempts. Try again in 15 minutes.");
  const db = await getDb();
  const [row] = await db.select({ hash: schema.adminUsers.passwordHash }).from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id));
  if (!row || !(await verifyPassword(row.hash, parsed.data.password))) return fail("Check your password.", { password: "That isn't your password." });
  await db.update(schema.adminUsers).set({ totpEnabled: false, totpSecret: null }).where(eq(schema.adminUsers.id, user.id));
  await audit("account.totp.disable", who(user));
  refresh();
  return done("Two-step verification is off");
}

/* ================================================================ team (owner only) */

const ALPHABET = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346789";
/** Readable one-time password, e.g. "kP7m-Qx3r-Ta9w-Ne4y" (19 characters, ~90 bits). */
function temporaryPassword() {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");
}

export type TempPasswordData = { email: string; password: string };

const addSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter their name." }).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." }).max(254)),
  role: z.enum(["owner", "staff"]),
});

export async function addAdmin(_prev: ActionState<TempPasswordData> | null, formData: FormData): Promise<ActionState<TempPasswordData>> {
  const owner = await requireAdmin({ role: "owner" });
  const parsed = addSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const db = await getDb();
  const [existing] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, parsed.data.email));
  if (existing) return fail("Check the highlighted fields.", { email: "There's already an account with that email." });
  const password = temporaryPassword();
  const [created] = await db
    .insert(schema.adminUsers)
    .values({ name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash: await hashPassword(password) })
    .returning({ id: schema.adminUsers.id });
  await audit("team.create", { ...who(owner), target: created!.id, detail: { email: parsed.data.email, role: parsed.data.role } });
  refresh();
  return done(`${parsed.data.name} can now sign in`, { email: parsed.data.email, password });
}

const targetSchema = z.object({ userId: z.uuid() });

async function findMember(userId: string) {
  const db = await getDb();
  const [member] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name, role: schema.adminUsers.role, disabled: schema.adminUsers.disabled })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, userId));
  return member ?? null;
}

/** Other active owners besides this person. There must always be one. */
async function otherActiveOwners(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.adminUsers)
    .where(and(eq(schema.adminUsers.role, "owner"), eq(schema.adminUsers.disabled, false), ne(schema.adminUsers.id, userId)));
  return Number(row?.n ?? 0);
}

const LAST_OWNER = "There must always be at least one active owner. Make someone else an owner first.";

export async function resetAdminPassword(_prev: ActionState<TempPasswordData> | null, formData: FormData): Promise<ActionState<TempPasswordData>> {
  const owner = await requireAdmin({ role: "owner" });
  const parsed = targetSchema.extend({ resetTotp: z.enum(["on"]).optional() }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, "Choose a team member.");
  const member = await findMember(parsed.data.userId);
  if (!member) return fail("That account no longer exists.");
  if (member.id === owner.id) return fail("Change your own password under My account.");
  const password = temporaryPassword();
  const db = await getDb();
  await db
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(password), ...(parsed.data.resetTotp ? { totpEnabled: false, totpSecret: null } : {}) })
    .where(eq(schema.adminUsers.id, member.id));
  await destroyAllSessionsFor(member.id);
  await audit("team.reset-password", { ...who(owner), target: member.id, detail: { email: member.email, resetTotp: Boolean(parsed.data.resetTotp) } });
  refresh();
  return done(`New password for ${member.name}`, { email: member.email, password });
}

export async function setAdminDisabled(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const owner = await requireAdmin({ role: "owner" });
  const parsed = targetSchema.extend({ disabled: z.enum(["true", "false"]) }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, "Choose a team member.");
  const member = await findMember(parsed.data.userId);
  if (!member) return fail("That account no longer exists.");
  const disable = parsed.data.disabled === "true";
  if (disable && member.id === owner.id) return fail("You can't disable your own account.");
  if (disable && member.role === "owner" && (await otherActiveOwners(member.id)) === 0) return fail(LAST_OWNER);
  const db = await getDb();
  await db.update(schema.adminUsers).set({ disabled: disable }).where(eq(schema.adminUsers.id, member.id));
  if (disable) await destroyAllSessionsFor(member.id);
  await audit(disable ? "team.disable" : "team.enable", { ...who(owner), target: member.id, detail: { email: member.email } });
  refresh();
  return done(disable ? `${member.name} can no longer sign in` : `${member.name} can sign in again`);
}

export async function setAdminRole(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const owner = await requireAdmin({ role: "owner" });
  const parsed = targetSchema.extend({ role: z.enum(["owner", "staff"]) }).safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, "Choose a role.");
  const member = await findMember(parsed.data.userId);
  if (!member) return fail("That account no longer exists.");
  if (member.role === parsed.data.role) return done();
  if (member.role === "owner" && parsed.data.role !== "owner" && (await otherActiveOwners(member.id)) === 0) return fail(LAST_OWNER);
  const db = await getDb();
  await db.update(schema.adminUsers).set({ role: parsed.data.role }).where(eq(schema.adminUsers.id, member.id));
  await audit("team.role", { ...who(owner), target: member.id, detail: { email: member.email, from: member.role, to: parsed.data.role } });
  refresh();
  return done(`${member.name} is now ${parsed.data.role === "owner" ? "an owner" : "staff"}`);
}

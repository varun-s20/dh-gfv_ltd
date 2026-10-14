/**
 * Display formatting for the admin, safe to use in Client Components.
 * money() and longDate() deliberately match gbp() and ukDate() in
 * src/lib/notify/templates.ts (server-only) so previews read exactly like the
 * messages the seller receives.
 */
import { LONDON } from "./time";

const gbpFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const gbpPrecise = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** £12,500 — whole pounds, as used in offers. */
export const money = (pence: number) => gbpFormatter.format(pence / 100);

/** £12,500.50 — only when pence matter (purchase prices). */
export const moneyExact = (pence: number) => (pence % 100 === 0 ? money(pence) : gbpPrecise.format(pence / 100));

export const num = (n: number) => n.toLocaleString("en-GB");

export const miles = (n: number) => `${n.toLocaleString("en-GB")} mi`;

const longDateFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: LONDON });
/** "Tuesday 20 October 2026" — matches ukDate() in the email templates. */
export const longDate = (date: Date) => longDateFormatter.format(date);

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: LONDON });
export const shortDate = (date: Date) => shortDateFormatter.format(date);

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: LONDON });
export const dayMonth = (date: Date) => dayMonthFormatter.format(date);

const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: LONDON });
export const clock = (date: Date) => timeFormatter.format(date);

/** "13 Oct, 14:05" (adds the year when it isn't the current one). */
export function dateTime(date: Date, now = new Date()) {
  const sameYear = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: LONDON }).format(date) === new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: LONDON }).format(now);
  return `${sameYear ? dayMonth(date) : shortDate(date)}, ${clock(date)}`;
}

/** Compact duration: "45s", "12m", "3h 20m", "2d 4h". */
export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

/** "3h 20m ago" / "just now". */
export function ago(date: Date, now: Date): string {
  const ms = now.getTime() - date.getTime();
  if (ms < 60_000) return "just now";
  return `${duration(ms)} ago`;
}

export const pct = (value: number | null) => (value === null || !Number.isFinite(value) ? "–" : `${Math.round(value * 100)}%`);

export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/** Pounds typed by a person ("12,500", "£12500.50") → pence, or null when it isn't a sensible amount. */
export function poundsToPence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const pence = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(pence) ? pence : null;
}

export const penceToPounds = (pence: number) => (pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2));

/**
 * Europe/London calendar helpers. The business runs on UK time, so "today",
 * report ranges and Google Ads conversion times are all computed in London
 * time, including across the BST/GMT changeovers. Pure and client-safe.
 */
export const LONDON = "Europe/London";

export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock parts of an instant in the given zone. */
export function zonedParts(date: Date, timeZone = LONDON): ZonedParts {
  const out: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

/** Minutes ahead of UTC at that instant: 0 in winter, 60 during BST. */
export function zoneOffsetMinutes(date: Date, timeZone = LONDON): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const whole = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - whole) / 60_000);
}

/** The instant of local midnight at the start of a London calendar date. Day overflow is allowed (day 32 → next month). */
export function londonMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = zoneOffsetMinutes(new Date(guess));
  let t = guess - first * 60_000;
  const second = zoneOffsetMinutes(new Date(t));
  if (second !== first) t = guess - second * 60_000;
  return new Date(t);
}

export function startOfLondonDay(date: Date): Date {
  const p = zonedParts(date);
  return londonMidnight(p.year, p.month, p.day);
}

/** Midnight London time, `days` calendar days after the day containing `date`. */
export function addLondonDays(date: Date, days: number): Date {
  const p = zonedParts(date);
  return londonMidnight(p.year, p.month, p.day + days);
}

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

/** "2026-10-13" for the London calendar date of an instant (the value an <input type=date> uses). */
export function londonDateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Parse "yyyy-mm-dd" strictly; returns null for anything else or impossible dates. */
export function parseDateKey(value: string | undefined | null): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  if (year < 2000 || year > 2100) return null;
  return { year, month, day };
}

/** London midnight at the start of a "yyyy-mm-dd" date, optionally shifted by whole days. */
export function dateKeyToInstant(value: string, shiftDays = 0): Date | null {
  const d = parseDateKey(value);
  return d ? londonMidnight(d.year, d.month, d.day + shiftDays) : null;
}

/**
 * Google Ads offline conversion time: "yyyy-MM-dd HH:mm:ssZ" where Z is the
 * RFC 822 offset, e.g. "2026-07-01 13:00:00+0100".
 */
export function formatConversionTime(date: Date, timeZone = LONDON): string {
  const p = zonedParts(date, timeZone);
  const offset = zoneOffsetMinutes(date, timeZone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

/** "2026-10-13 14:05" in London time, for CSV exports. */
export function formatLondonDateTime(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

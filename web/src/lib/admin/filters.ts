/**
 * Lead list filters live in the URL so every view is shareable and the CSV
 * export can reproduce it exactly. Parsing is lenient: anything invalid is
 * dropped rather than erroring. Pure and client-safe.
 */
import { normaliseReg } from "@/lib/vehicles";
import { LEAD_STATUSES, type LeadStatusValue } from "./status";
import { parseDateKey } from "./time";

export const CATEGORIES = ["tesla", "ev", "van"] as const;
export type CategoryValue = (typeof CATEGORIES)[number];

export const PAGE_SIZE = 25;

export type LeadFilters = {
  q?: string;
  status?: LeadStatusValue;
  category?: CategoryValue;
  channel?: string;
  campaign?: string;
  from?: string;
  to?: string;
  sort: "newest" | "oldest";
  page: number;
};

type SearchInput = URLSearchParams | Record<string, string | string[] | undefined>;

function read(input: SearchInput, key: string): string | undefined {
  const raw = input instanceof URLSearchParams ? input.get(key) : input[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const token = (value: string | undefined, max = 120) =>
  value && value.length <= max && /^[\w ./:@+-]+$/.test(value) ? value : undefined;

export function parseLeadFilters(input: SearchInput): LeadFilters {
  const q = read(input, "q")?.slice(0, 100);
  const status = read(input, "status");
  const category = read(input, "category");
  const from = read(input, "from");
  const to = read(input, "to");
  const page = Number(read(input, "page") ?? 1);
  return {
    q: q || undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(status ?? "") ? (status as LeadStatusValue) : undefined,
    category: (CATEGORIES as readonly string[]).includes(category ?? "") ? (category as CategoryValue) : undefined,
    channel: token(read(input, "channel")),
    campaign: token(read(input, "campaign")),
    from: parseDateKey(from) ? from : undefined,
    to: parseDateKey(to) ? to : undefined,
    sort: read(input, "sort") === "oldest" ? "oldest" : "newest",
    page: Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1,
  };
}

/** Canonical query string ("" or "?a=b") with defaults and empty values left out. */
export function filtersToQuery(filters: Partial<LeadFilters>, overrides: Partial<LeadFilters> = {}): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.status) params.set("status", f.status);
  if (f.category) params.set("category", f.category);
  if (f.channel) params.set("channel", f.channel);
  if (f.campaign) params.set("campaign", f.campaign);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.sort === "oldest") params.set("sort", "oldest");
  if (f.page && f.page > 1) params.set("page", String(f.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const hasActiveFilters = (f: LeadFilters) => Boolean(f.q || f.status || f.category || f.channel || f.campaign || f.from || f.to);

/** Escape LIKE wildcards so a search for "50%" means the characters, not a pattern. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * One search box covers ref, name, email, registration (with or without
 * spaces) and phone (07…, +44…, or a fragment).
 */
export function searchTerms(q: string): { text: string; reg?: string; phoneDigits?: string } {
  const text = q.trim();
  const reg = normaliseReg(text);
  let phoneDigits: string | undefined;
  if (/^[\d\s()+-]{4,}$/.test(text)) {
    let digits = text.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
    if (digits.length >= 4) phoneDigits = digits;
  }
  return { text, reg: reg.length >= 2 ? reg : undefined, phoneDigits };
}

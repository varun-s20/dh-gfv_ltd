import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { getDb, schema } from "@/lib/db/client";
import { escapeLike, PAGE_SIZE, searchTerms, type LeadFilters } from "./filters";
import type { ReportLead } from "./report";
import { dateKeyToInstant, startOfLondonDay } from "./time";

/**
 * Read models for the admin. Every function here is called only after
 * requireAdmin()/adminForApi() has authorised the request.
 */

const L = schema.leads;
const Q = schema.quotes;
const P = schema.leadPhotos;


const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ts = (date: Date) => sql`${date.toISOString()}::timestamptz`;
const int = (expr: SQL) => sql<number>`(${expr})::int`.mapWith(Number);

/*
 * Correlated subqueries are written with explicit table qualifiers: in a
 * single-table select Drizzle renders column references unqualified, which
 * would make "lead_id = id" compare a row with itself inside the subquery.
 */
const photoCount = sql<number>`(select count(*)::int from "lead_photos" p where p."lead_id" = "leads"."id")`.mapWith(Number);
/** Amount of the newest offer that is still live or decided (ignores superseded versions and drafts). */
const latestOfferPence = sql<number | null>`(select q."amount_pence" from "quotes" q where q."lead_id" = "leads"."id" and q."status" not in ('superseded', 'draft') order by q."version" desc limit 1)`.mapWith(Number);
const acceptedPence = sql<number | null>`(select q."amount_pence" from "quotes" q where q."lead_id" = "leads"."id" and q."status" = 'accepted' order by q."version" desc limit 1)`.mapWith(Number);
const acceptedAt = sql<Date | null>`(select q."responded_at" from "quotes" q where q."lead_id" = "leads"."id" and q."status" = 'accepted' order by q."version" desc limit 1)`.mapWith(Q.respondedAt);

/* ---------------------------------------------------------------- filters → SQL */

export function leadWhere(f: LeadFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (f.q) {
    const t = searchTerms(f.q);
    const like = `%${escapeLike(t.text)}%`;
    const any: SQL[] = [ilike(L.ref, like), ilike(L.fullName, like), ilike(L.email, like)];
    if (t.reg) any.push(ilike(L.registration, `%${escapeLike(t.reg)}%`));
    if (t.phoneDigits) any.push(sql`regexp_replace(${L.phone}, '[^0-9]', '', 'g') like ${`%${t.phoneDigits}%`}`);
    conditions.push(or(...any)!);
  }
  if (f.status) conditions.push(eq(L.status, f.status));
  if (f.category) conditions.push(eq(L.category, f.category));
  if (f.channel) conditions.push(eq(L.channel, f.channel));
  if (f.campaign) conditions.push(eq(L.utmCampaign, f.campaign));
  const from = f.from ? dateKeyToInstant(f.from) : null;
  const to = f.to ? dateKeyToInstant(f.to, 1) : null;
  if (from) conditions.push(gte(L.createdAt, from));
  if (to) conditions.push(lt(L.createdAt, to));
  return conditions.length ? and(...conditions) : undefined;
}

/* ---------------------------------------------------------------- shell */

export const getNavCounts = cache(async () => {
  const db = await getDb();
  const stale = new Date(Date.now() - 2 * HOUR);
  const [row] = await db
    .select({
      fresh: int(sql`count(*) filter (where ${L.status} = 'new')`),
      stale: int(sql`count(*) filter (where ${L.status} = 'new' and ${L.firstResponseAt} is null and ${L.createdAt} < ${ts(stale)})`),
    })
    .from(L);
  return { fresh: row?.fresh ?? 0, stale: row?.stale ?? 0 };
});

/* ---------------------------------------------------------------- dashboard */

const leadCard = {
  id: L.id,
  ref: L.ref,
  status: L.status,
  category: L.category,
  registration: L.registration,
  make: L.make,
  model: L.model,
  year: L.year,
  mileage: L.mileage,
  fullName: L.fullName,
  contactPreference: L.contactPreference,
  channel: L.channel,
  createdAt: L.createdAt,
  photoCount,
};

export async function getDashboard(now: Date) {
  const db = await getDb();
  const today = startOfLondonDay(now);
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = new Date(now.getTime() - 14 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const stale = new Date(now.getTime() - 2 * HOUR);

  const [leadStats, offerStats, statusCounts, attention, recent, byCategory, byChannel] = await Promise.all([
    db
      .select({
        today: int(sql`count(*) filter (where ${L.createdAt} >= ${ts(today)})`),
        week: int(sql`count(*) filter (where ${L.createdAt} >= ${ts(d7)})`),
        prevWeek: int(sql`count(*) filter (where ${L.createdAt} >= ${ts(d14)} and ${L.createdAt} < ${ts(d7)})`),
        awaiting: int(sql`count(*) filter (where ${L.status} = 'new' and ${L.firstResponseAt} is null)`),
        stale: int(sql`count(*) filter (where ${L.status} = 'new' and ${L.firstResponseAt} is null and ${L.createdAt} < ${ts(stale)})`),
        oldestAwaiting: sql<Date | null>`min(${L.createdAt}) filter (where ${L.status} = 'new' and ${L.firstResponseAt} is null)`.mapWith(L.createdAt),
        medianResponseSec: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${L.firstResponseAt} - ${L.createdAt}))) filter (where ${L.firstResponseAt} is not null and ${L.createdAt} >= ${ts(d30)})`.mapWith(Number),
        responded30: int(sql`count(*) filter (where ${L.firstResponseAt} is not null and ${L.createdAt} >= ${ts(d30)})`),
      })
      .from(L),
    db
      .select({
        sent: int(sql`count(*) filter (where ${Q.sentAt} >= ${ts(d30)})`),
        sellers: int(sql`count(distinct ${Q.leadId}) filter (where ${Q.sentAt} >= ${ts(d30)})`),
        acceptedSellers: int(sql`count(distinct ${Q.leadId}) filter (where ${Q.sentAt} >= ${ts(d30)} and ${Q.status} = 'accepted')`),
        accepted: int(sql`count(*) filter (where ${Q.status} = 'accepted' and ${Q.respondedAt} >= ${ts(d30)})`),
        acceptedValue: sql<number | null>`sum(${Q.amountPence}) filter (where ${Q.status} = 'accepted' and ${Q.respondedAt} >= ${ts(d30)})`.mapWith(Number),
      })
      .from(Q),
    db.select({ status: L.status, count: int(sql`count(*)`) }).from(L).groupBy(L.status),
    db
      .select(leadCard)
      .from(L)
      .where(and(eq(L.status, "new"), sql`${L.firstResponseAt} is null`, lt(L.createdAt, stale)))
      .orderBy(asc(L.createdAt))
      .limit(6),
    db.select(leadCard).from(L).orderBy(desc(L.createdAt)).limit(6),
    db.select({ key: L.category, count: int(sql`count(*)`) }).from(L).where(gte(L.createdAt, d30)).groupBy(L.category),
    db.select({ key: L.channel, count: int(sql`count(*)`) }).from(L).where(gte(L.createdAt, d30)).groupBy(L.channel).orderBy(desc(sql`count(*)`)),
  ]);

  return {
    leads: leadStats[0] ?? { today: 0, week: 0, prevWeek: 0, awaiting: 0, stale: 0, oldestAwaiting: null, medianResponseSec: null, responded30: 0 },
    offers: offerStats[0] ?? { sent: 0, sellers: 0, acceptedSellers: 0, accepted: 0, acceptedValue: null },
    statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.count])) as Record<string, number>,
    attention,
    recent,
    byCategory,
    byChannel,
  };
}

export type LeadCard = Awaited<ReturnType<typeof getDashboard>>["recent"][number];

/* ---------------------------------------------------------------- lead list */

const listColumns = {
  ...leadCard,
  variant: L.variant,
  utmCampaign: L.utmCampaign,
  firstResponseAt: L.firstResponseAt,
  offerPence: latestOfferPence,
};

export async function listLeads(f: LeadFilters) {
  const db = await getDb();
  const where = leadWhere(f);
  const order = f.sort === "oldest" ? [asc(L.createdAt), asc(L.id)] : [desc(L.createdAt), desc(L.id)];
  const [rows, counted] = await Promise.all([
    db
      .select(listColumns)
      .from(L)
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: int(sql`count(*)`) }).from(L).where(where),
  ]);
  return { rows, total: counted[0]?.total ?? 0 };
}

export type LeadListRow = Awaited<ReturnType<typeof listLeads>>["rows"][number];

/** Counts per status for the current filter, ignoring the status filter itself (for the quick tabs). */
export async function statusCountsFor(f: LeadFilters) {
  const db = await getDb();
  const rows = await db
    .select({ status: L.status, count: int(sql`count(*)`) })
    .from(L)
    .where(leadWhere({ ...f, status: undefined }))
    .groupBy(L.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count])) as Record<string, number>;
}

export async function getFilterOptions() {
  const db = await getDb();
  const [channels, campaigns] = await Promise.all([
    db.selectDistinct({ value: L.channel }).from(L).orderBy(L.channel),
    db.selectDistinct({ value: L.utmCampaign }).from(L).where(isNotNull(L.utmCampaign)).orderBy(L.utmCampaign),
  ]);
  return { channels: channels.map((c) => c.value), campaigns: campaigns.map((c) => c.value).filter((v): v is string => Boolean(v)) };
}

/** Every column the CSV needs, for the same filter as the list (capped). */
export async function exportLeads(f: LeadFilters, cap = 10_000) {
  const db = await getDb();
  return db
    .select({ lead: L, photoCount, offerPence: latestOfferPence, acceptedPence })
    .from(L)
    .where(leadWhere(f))
    .orderBy(f.sort === "oldest" ? asc(L.createdAt) : desc(L.createdAt))
    .limit(cap);
}

/* ---------------------------------------------------------------- lead detail */

export async function getLeadDetail(id: string) {
  const db = await getDb();
  const [leadRows, photos, events, messages, quotes] = await Promise.all([
    db.select().from(L).where(eq(L.id, id)).limit(1),
    db.select().from(P).where(eq(P.leadId, id)).orderBy(asc(P.position), asc(P.createdAt)),
    db.select().from(schema.leadEvents).where(eq(schema.leadEvents.leadId, id)).orderBy(asc(schema.leadEvents.createdAt)),
    db.select().from(schema.messages).where(eq(schema.messages.leadId, id)).orderBy(asc(schema.messages.createdAt)),
    db.select().from(Q).where(eq(Q.leadId, id)).orderBy(desc(Q.version)),
  ]);
  const lead = leadRows[0];
  if (!lead) return null;
  return { lead, photos, events, messages, quotes };
}

/* ---------------------------------------------------------------- reports */

export async function getReportRows(from: Date, to: Date): Promise<{ leads: ReportLead[]; offers: { sent: number; sellers: number; accepted: number; declined: number; viewed: number } }> {
  const db = await getDb();
  const quoted = sql<boolean>`exists (select 1 from "quotes" q where q."lead_id" = "leads"."id" and q."sent_at" is not null)`.mapWith(Boolean);
  const accepted = sql<boolean>`exists (select 1 from "quotes" q where q."lead_id" = "leads"."id" and q."status" = 'accepted')`.mapWith(Boolean);
  const [leads, offers] = await Promise.all([
    db
      .select({
        createdAt: L.createdAt,
        category: L.category,
        channel: L.channel,
        campaign: L.utmCampaign,
        status: L.status,
        firstResponseAt: L.firstResponseAt,
        purchasePricePence: L.purchasePricePence,
        quoted,
        accepted,
        acceptedPence,
      })
      .from(L)
      .where(and(gte(L.createdAt, from), lt(L.createdAt, to)))
      .limit(50_000),
    db
      .select({
        sent: int(sql`count(*)`),
        sellers: int(sql`count(distinct ${Q.leadId})`),
        accepted: int(sql`count(distinct ${Q.leadId}) filter (where ${Q.status} = 'accepted')`),
        declined: int(sql`count(distinct ${Q.leadId}) filter (where ${Q.status} = 'declined')`),
        viewed: int(sql`count(*) filter (where ${Q.viewedAt} is not null)`),
      })
      .from(Q)
      .where(and(gte(Q.sentAt, from), lt(Q.sentAt, to))),
  ]);
  return { leads, offers: offers[0] ?? { sent: 0, sellers: 0, accepted: 0, declined: 0, viewed: 0 } };
}

/* ---------------------------------------------------------------- Google Ads */

export async function getConversionCandidates() {
  const db = await getDb();
  return db
    .select({
      gclid: L.gclid,
      status: L.status,
      purchasePricePence: L.purchasePricePence,
      closedAt: L.closedAt,
      updatedAt: L.updatedAt,
      acceptedPence,
      acceptedAt,
    })
    .from(L)
    .where(and(isNotNull(L.gclid), inArray(L.status, ["accepted", "closed"])));
}

/* ---------------------------------------------------------------- team */

export async function listTeam() {
  const db = await getDb();
  const now = new Date();
  return db
    .select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.role,
      totpEnabled: schema.adminUsers.totpEnabled,
      disabled: schema.adminUsers.disabled,
      lastLoginAt: schema.adminUsers.lastLoginAt,
      createdAt: schema.adminUsers.createdAt,
      sessions: int(sql`(select count(*) from "sessions" s where s."user_id" = "admin_users"."id" and s."expires_at" > ${ts(now)})`),
    })
    .from(schema.adminUsers)
    .orderBy(asc(schema.adminUsers.disabled), desc(sql`${schema.adminUsers.role} = 'owner'`), asc(schema.adminUsers.name));
}

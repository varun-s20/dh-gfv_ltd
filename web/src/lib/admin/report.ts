/**
 * Report aggregation for a cohort of leads (those created in the range).
 * Pure, so the funnel rules are unit-tested rather than buried in SQL.
 *
 * Funnel stages, each implying the ones before it:
 *   quoted   – an offer was sent (or the lead was marked quoted/accepted by hand)
 *   accepted – the seller accepted an offer, or the deal was marked accepted/bought
 *   bought   – a purchase price was recorded (the lead is closed as a sale)
 */
import { londonDateKey } from "./time";

export type ReportLead = {
  createdAt: Date;
  category: string;
  channel: string;
  campaign: string | null;
  status: string;
  firstResponseAt: Date | null;
  purchasePricePence: number | null;
  quoted: boolean;
  accepted: boolean;
  acceptedPence: number | null;
};

export type Breakdown = { key: string; leads: number; quoted: number; accepted: number; bought: number; boughtValue: number };

export function stages(lead: ReportLead) {
  const bought = (lead.purchasePricePence ?? 0) > 0;
  const accepted = bought || lead.accepted || lead.status === "accepted";
  const quoted = accepted || lead.quoted || lead.status === "quoted";
  return { quoted, accepted, bought };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function breakdown(leads: ReportLead[], keyOf: (l: ReportLead) => string): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const lead of leads) {
    const key = keyOf(lead);
    const row = map.get(key) ?? { key, leads: 0, quoted: 0, accepted: 0, bought: 0, boughtValue: 0 };
    const s = stages(lead);
    row.leads++;
    if (s.quoted) row.quoted++;
    if (s.accepted) row.accepted++;
    if (s.bought) {
      row.bought++;
      row.boughtValue += lead.purchasePricePence ?? 0;
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads || a.key.localeCompare(b.key));
}

export function summariseReport(leads: ReportLead[], dayKeys: string[]) {
  const totals = { leads: leads.length, quoted: 0, accepted: 0, bought: 0, boughtValue: 0, acceptedValue: 0 };
  const responseMs: number[] = [];
  const perDay = new Map(dayKeys.map((k) => [k, 0]));
  for (const lead of leads) {
    const s = stages(lead);
    if (s.quoted) totals.quoted++;
    if (s.accepted) {
      totals.accepted++;
      totals.acceptedValue += lead.purchasePricePence ?? lead.acceptedPence ?? 0;
    }
    if (s.bought) {
      totals.bought++;
      totals.boughtValue += lead.purchasePricePence ?? 0;
    }
    if (lead.firstResponseAt) responseMs.push(Math.max(0, lead.firstResponseAt.getTime() - lead.createdAt.getTime()));
    const key = londonDateKey(lead.createdAt);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  return {
    totals,
    response: { count: responseMs.length, meanMs: mean(responseMs), medianMs: median(responseMs) },
    byCategory: breakdown(leads, (l) => l.category),
    byChannel: breakdown(leads, (l) => l.channel),
    byCampaign: breakdown(leads, (l) => l.campaign ?? "(none)"),
    daily: [...perDay.entries()].map(([day, count]) => ({ day, count })),
  };
}

export type ReportSummary = ReturnType<typeof summariseReport>;

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

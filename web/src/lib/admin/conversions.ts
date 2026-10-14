/**
 * Google Ads offline conversion import ("Conversions from clicks").
 * Template columns, in this order:
 *   Google Click ID, Conversion Name, Conversion Time, Conversion Value, Conversion Currency
 * Conversion Time uses "yyyy-MM-dd HH:mm:ssZ" with an explicit offset, so no
 * "Parameters:TimeZone" line is needed. Pure: the route handler loads the data.
 */
import { neutraliseFormula, toCsv } from "./csv";
import { formatConversionTime } from "./time";

export const CONVERSION_HEADER = ["Google Click ID", "Conversion Name", "Conversion Time", "Conversion Value", "Conversion Currency"];

export const DEFAULT_CONVERSION_NAME = "Vehicle purchased";

/** gclids are URL-safe base64-ish tokens; anything else is a tracking glitch and is skipped. */
const GCLID = /^[A-Za-z0-9_-]{10,200}$/;

export type ConversionCandidate = {
  gclid: string | null;
  status: string;
  purchasePricePence: number | null;
  closedAt: Date | null;
  acceptedPence: number | null;
  acceptedAt: Date | null;
  updatedAt: Date;
};

export type ConversionRow = { gclid: string; name: string; time: Date; valuePence: number; currency: "GBP" };

/**
 * One row per lead that reached accepted/closed with a value we can stand behind:
 * the price actually paid when a purchase is recorded, otherwise the accepted
 * offer. Closed leads with neither (lost deals) are not conversions.
 */
export function toConversionRows(leads: ConversionCandidate[], conversionName: string): ConversionRow[] {
  const name = conversionName.trim() || DEFAULT_CONVERSION_NAME;
  const rows: ConversionRow[] = [];
  for (const lead of leads) {
    if (!lead.gclid || !GCLID.test(lead.gclid)) continue;
    if (lead.status !== "accepted" && lead.status !== "closed") continue;
    const purchased = lead.purchasePricePence !== null && lead.purchasePricePence > 0;
    const valuePence = purchased ? lead.purchasePricePence! : lead.acceptedPence;
    if (valuePence === null || valuePence <= 0) continue;
    const time = purchased ? (lead.closedAt ?? lead.acceptedAt ?? lead.updatedAt) : (lead.acceptedAt ?? lead.updatedAt);
    rows.push({ gclid: lead.gclid, name, time, valuePence, currency: "GBP" });
  }
  return rows.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** "12500.00" — Google expects a plain decimal number without currency symbols or separators. */
export const conversionValue = (pence: number) => (pence / 100).toFixed(2);

export function conversionsCsv(rows: ConversionRow[]): string {
  return toCsv(
    CONVERSION_HEADER,
    // gclids are validated above; the name is user-configurable so it is neutralised.
    rows.map((r) => [r.gclid, neutraliseFormula(r.name), formatConversionTime(r.time), conversionValue(r.valuePence), r.currency]),
  );
}

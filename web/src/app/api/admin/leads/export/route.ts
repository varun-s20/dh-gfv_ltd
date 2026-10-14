import { apiAdmin, csvResponse } from "@/lib/admin/api";
import { csvFilename, toCsv, type CsvValue } from "@/lib/admin/csv";
import { parseLeadFilters } from "@/lib/admin/filters";
import { conditionLabel, financeLabel } from "@/lib/admin/labels";
import { exportLeads } from "@/lib/admin/queries";
import { channelLabel } from "@/lib/admin/status";
import { formatLondonDateTime, londonDateKey } from "@/lib/admin/time";
import { audit } from "@/lib/security";

const HEADER = [
  "Reference",
  "Received",
  "Status",
  "Category",
  "Registration",
  "Make",
  "Model",
  "Variant",
  "Year",
  "Mileage",
  "Condition",
  "Damage",
  "Battery health %",
  "Finance",
  "Settlement £",
  "Seller",
  "Business",
  "Email",
  "Phone",
  "Postcode",
  "Prefers",
  "Marketing opt-in",
  "Photos",
  "Latest offer £",
  "Accepted offer £",
  "Purchase price £",
  "First response",
  "Closed",
  "Channel",
  "UTM source",
  "UTM medium",
  "UTM campaign",
  "UTM term",
  "UTM content",
  "GCLID",
  "Landing page",
  "Referrer",
];

const pounds = (pence: number | null | undefined) => (pence === null || pence === undefined ? null : Number((pence / 100).toFixed(2)));
const when = (d: Date | null) => (d ? formatLondonDateTime(d) : null);

/** CSV of the leads matching the same filters as the list view (London times, RFC 4180, formula-safe). */
export async function GET(request: Request) {
  const { user, response } = await apiAdmin();
  if (response) return response;

  const filters = parseLeadFilters(new URL(request.url).searchParams);
  const rows = await exportLeads(filters);
  const body = toCsv(
    HEADER,
    rows.map(({ lead: l, photoCount, offerPence, acceptedPence }): CsvValue[] => [
      l.ref,
      when(l.createdAt),
      l.status,
      l.category,
      l.registration,
      l.make,
      l.model,
      l.variant,
      l.year,
      l.mileage,
      conditionLabel(l.condition),
      l.damage,
      l.batteryHealth,
      financeLabel(l.finance),
      pounds(l.financeSettlementPence),
      l.fullName,
      l.businessName,
      l.email,
      l.phone,
      l.postcode,
      l.contactPreference,
      l.marketingOptIn,
      photoCount,
      pounds(offerPence),
      pounds(acceptedPence),
      pounds(l.purchasePricePence),
      when(l.firstResponseAt),
      when(l.closedAt),
      channelLabel(l.channel),
      l.utmSource,
      l.utmMedium,
      l.utmCampaign,
      l.utmTerm,
      l.utmContent,
      l.gclid,
      l.landingPage,
      l.referrer,
    ]),
    { bom: true },
  );

  // Exports contain personal data, so who took one (and of what) is recorded.
  await audit("export.leads", { actorId: user.id, actorEmail: user.email, detail: { rows: rows.length, filters } });
  return csvResponse(body, csvFilename("green-future-leads", londonDateKey(new Date())));
}

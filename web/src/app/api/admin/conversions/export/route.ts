import { apiAdmin, csvResponse } from "@/lib/admin/api";
import { conversionsCsv, toConversionRows } from "@/lib/admin/conversions";
import { csvFilename } from "@/lib/admin/csv";
import { getConversionCandidates } from "@/lib/admin/queries";
import { getSetting } from "@/lib/admin/settings";
import { dateKeyToInstant, londonDateKey } from "@/lib/admin/time";
import { audit } from "@/lib/security";

/**
 * Google Ads offline conversions ("Conversions from clicks" upload template)
 * for leads with a gclid that reached accepted/closed. Optional ?from=&to=
 * (yyyy-mm-dd, London dates, inclusive) filter on the conversion time.
 * Google only accepts clicks from the last 90 days, so older rows are dropped
 * by Google at import; we leave that rule to Google rather than guess.
 */
export async function GET(request: Request) {
  const { user, response } = await apiAdmin();
  if (response) return response;

  const params = new URL(request.url).searchParams;
  const from = dateKeyToInstant(params.get("from") ?? "");
  const to = dateKeyToInstant(params.get("to") ?? "", 1);

  const [candidates, name] = await Promise.all([getConversionCandidates(), getSetting("ads.conversionName")]);
  const rows = toConversionRows(candidates, name).filter((r) => (!from || r.time >= from) && (!to || r.time < to));

  await audit("export.conversions", { actorId: user.id, actorEmail: user.email, detail: { rows: rows.length, from: params.get("from"), to: params.get("to") } });
  return csvResponse(conversionsCsv(rows), csvFilename("google-ads-conversions", londonDateKey(new Date())));
}

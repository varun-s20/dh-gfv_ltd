import { clsx } from "clsx";
import { Download, FileSpreadsheet } from "lucide-react";
import type { Metadata, Route } from "next";
import Form from "next/form";
import Link from "next/link";
import { btn, cardClass, inputClass, tableWrap, td, th } from "@/components/admin/styles";
import { Card, Kpi, PageHeader } from "@/components/admin/ui";
import { duration, money, num, pct, shortDate } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/guard";
import { getReportRows } from "@/lib/admin/queries";
import { ratio, summariseReport, type Breakdown } from "@/lib/admin/report";
import { getSetting } from "@/lib/admin/settings";
import { channelLabel } from "@/lib/admin/status";
import { addLondonDays, dateKeyToInstant, londonDateKey } from "@/lib/admin/time";
import { categoryLabel, type Category } from "@/lib/vehicles";

export const metadata: Metadata = { title: "Reports" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const PRESETS = [7, 30, 90] as const;
const DAY = 86_400_000;

function resolveRange(params: Record<string, string | string[] | undefined>, now: Date) {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  if (one("range") === "custom") {
    const from = dateKeyToInstant(one("from") ?? "");
    const to = dateKeyToInstant(one("to") ?? "", 1);
    if (from && to && from < to && to.getTime() - from.getTime() <= 400 * DAY) {
      return { key: "custom" as const, from, to, fromKey: one("from")!, toKey: one("to")! };
    }
  }
  const days = PRESETS.find((p) => String(p) === one("range")) ?? 30;
  const from = addLondonDays(now, -(days - 1));
  const to = addLondonDays(now, 1);
  return { key: String(days) as `${(typeof PRESETS)[number]}`, from, to, fromKey: londonDateKey(from), toKey: londonDateKey(now) };
}

function dayKeys(from: Date, to: Date) {
  const keys: string[] = [];
  for (let d = from; d < to && keys.length < 400; d = addLondonDays(d, 1)) keys.push(londonDateKey(d));
  return keys;
}

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  const now = new Date();
  const range = resolveRange(await searchParams, now);
  const keys = dayKeys(range.from, range.to);
  const [{ leads, offers }, conversionName] = await Promise.all([getReportRows(range.from, range.to), getSetting("ads.conversionName")]);
  const r = summariseReport(leads, keys);
  const t = r.totals;
  const rangeQuery = `?from=${range.fromKey}&to=${range.toKey}`;
  const lastDay = new Date(range.to.getTime() - 1);

  const funnel = [
    { key: "leads", label: "Leads", value: t.leads },
    { key: "quoted", label: "Offer sent", value: t.quoted },
    { key: "accepted", label: "Accepted", value: t.accepted },
    { key: "bought", label: "Closed (bought)", value: t.bought },
  ];
  // Ordered stages: one hue stepping from light to dark.
  const ramp = ["#9fbfaf", "#5f8f78", "#2f6450", "#0b2a21"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={
          <>
            Leads received {shortDate(range.from)} to {shortDate(lastDay)}, London time. Each lead is counted in the period it arrived, then followed through the funnel.
          </>
        }
        actions={
          <>
            <a href={`/api/admin/leads/export${rangeQuery}`} className={btn("secondary", "md")} download>
              <Download aria-hidden />
              Leads CSV
            </a>
            <a href={`/api/admin/conversions/export${rangeQuery}`} className={btn("secondary", "md")} download>
              <FileSpreadsheet aria-hidden />
              Google Ads CSV
            </a>
          </>
        }
      />

      {/* Range */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Date range" className="inline-flex w-fit rounded-full bg-ink/[0.05] p-1">
          {PRESETS.map((p) => (
            <Link
              key={p}
              href={`/admin/reports?range=${p}` as Route}
              aria-current={range.key === String(p) ? "page" : undefined}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                range.key === String(p) ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgb(13_19_17/0.12)]" : "text-slate hover:text-ink",
              )}
            >
              {p} days
            </Link>
          ))}
        </nav>
        <Form action="/admin/reports" className="flex flex-wrap items-end gap-2" aria-label="Custom range">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label htmlFor="r-from" className="mb-1 block text-xs font-medium text-slate">
              From
            </label>
            <input id="r-from" name="from" type="date" required defaultValue={range.fromKey} max={londonDateKey(now)} className={inputClass("w-40 font-mono text-[0.85rem]")} />
          </div>
          <div>
            <label htmlFor="r-to" className="mb-1 block text-xs font-medium text-slate">
              To
            </label>
            <input id="r-to" name="to" type="date" required defaultValue={range.toKey} max={londonDateKey(now)} className={inputClass("w-40 font-mono text-[0.85rem]")} />
          </div>
          <button type="submit" className={btn(range.key === "custom" ? "primary" : "secondary", "md")}>
            Apply
          </button>
        </Form>
      </div>

      {/* Totals */}
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <Kpi label="Leads" value={num(t.leads)} detail={`${num(r.response.count)} replied to`} />
        <Kpi label="Offers sent" value={num(t.quoted)} detail={t.leads ? `${pct(ratio(t.quoted, t.leads))} of leads` : "No leads"} />
        <Kpi label="Accepted" value={num(t.accepted)} tone={t.accepted ? "good" : "default"} detail={t.acceptedValue ? `${money(t.acceptedValue)} agreed` : "None yet"} />
        <Kpi label="Bought" value={num(t.bought)} detail={t.boughtValue ? `${money(t.boughtValue)} paid` : "No purchases recorded"} />
        <Kpi label="Offer → accepted" value={pct(ratio(t.accepted, t.quoted))} detail={`${num(t.accepted)} of ${num(t.quoted)} offered`} />
        <Kpi
          label="First reply"
          value={r.response.medianMs !== null ? duration(r.response.medianMs) : "–"}
          detail={r.response.meanMs !== null ? `Median · average ${duration(r.response.meanMs)}` : "No replies yet"}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Funnel" description="Leads that arrived in the period, by the furthest stage reached">
          <ol className="space-y-4">
            {funnel.map((stage, i) => {
              const share = ratio(stage.value, t.leads);
              const prev = i > 0 ? funnel[i - 1]!.value : null;
              const step = prev !== null ? ratio(stage.value, prev) : null;
              return (
                <li key={stage.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{stage.label}</span>
                    <span className="flex items-baseline gap-3">
                      {step !== null ? <span className="text-xs text-slate">{pct(step)} of previous</span> : null}
                      <span className="font-mono text-ink tabular-nums">{num(stage.value)}</span>
                    </span>
                  </div>
                  <svg className="h-6 w-full" aria-hidden role="presentation">
                    <title>{`${stage.label}: ${stage.value} (${pct(share)} of leads)`}</title>
                    <rect width="100%" height="100%" rx="4" fill="rgb(13 19 17 / 0.05)" />
                    {stage.value > 0 ? (
                      <>
                        <rect width={`${Math.max(1, (share ?? 0) * 100)}%`} height="100%" rx="4" fill={ramp[i]} />
                        <rect width={`${Math.min(Math.max(1, (share ?? 0) * 100), 1)}%`} height="100%" fill={ramp[i]} />
                      </>
                    ) : null}
                  </svg>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-xs leading-relaxed text-slate">
            Offer sent includes leads marked quoted by hand. Closed (bought) means a purchase price was recorded.
          </p>
        </Card>

        <Card title="Leads per day" description={`${keys.length} days`}>
          <DailyColumns daily={r.daily} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <BreakdownTable
          title="By vehicle"
          rows={r.byCategory}
          label={(k) => categoryLabel[k as Category] ?? k}
        />
        <BreakdownTable title="By channel" rows={r.byChannel} label={channelLabel} />
      </div>
      <BreakdownTable title="By Google Ads campaign (utm_campaign)" rows={r.byCampaign} label={(k) => (k === "(none)" ? <span className="text-slate">No campaign</span> : <span className="font-mono text-[0.85rem]">{k}</span>)} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Offers sent in the period" description="Every offer sent between these dates, whenever the lead arrived">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="Offers sent" value={num(offers.sent)} />
            <Figure label="Opened" value={num(offers.viewed)} hint={offers.sent ? pct(ratio(offers.viewed, offers.sent)) : undefined} />
            <Figure label="Sellers accepted" value={num(offers.accepted)} hint={offers.sellers ? pct(ratio(offers.accepted, offers.sellers)) : undefined} />
            <Figure label="Sellers declined" value={num(offers.declined)} hint={offers.sellers ? pct(ratio(offers.declined, offers.sellers)) : undefined} />
          </dl>
        </Card>
        <Card title="Google Ads offline conversions" description="Feed real purchases back to Google so bidding learns what a good lead looks like">
          <div className="space-y-3 text-sm text-slate">
            <p>
              The export lists every lead with a Google click ID that reached accepted or closed, valued at the price paid (or the accepted offer), timed in London time, under the conversion
              name <strong className="font-mono font-medium text-ink">{conversionName}</strong>.
            </p>
            <p>
              In Google Ads, go to <span className="text-ink">Goals › Conversions › Uploads</span>, choose &ldquo;Conversions from clicks&rdquo; and upload the file. Change the conversion name in{" "}
              <Link href="/admin/settings#ads" className="text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                Settings
              </Link>
              .
            </p>
            <a href={`/api/admin/conversions/export${rangeQuery}`} className={btn("primary", "md", "mt-1")} download>
              <FileSpreadsheet aria-hidden />
              Download for this period
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-xl text-ink tabular-nums">{value}</span>
        {hint ? <span className="text-xs text-slate">{hint}</span> : null}
      </dd>
    </div>
  );
}

/** One column per day; single series, one hue, rounded data end. Values in the tooltip and the table below. */
function DailyColumns({ daily }: { daily: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  const ticks = [max, Math.round(max / 2), 0].filter((v, i, a) => a.indexOf(v) === i);
  const label = (key: string) => {
    const [, m, d] = key.split("-");
    return `${Number(d)}/${Number(m)}`;
  };
  const every = Math.max(1, Math.ceil(daily.length / 8));
  return (
    <figure>
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
        <div className="relative h-44 font-mono text-[0.68rem] text-slate tabular-nums" aria-hidden>
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (v / max) * 100}%` }}>
              {v}
            </span>
          ))}
        </div>
        <div className="relative h-44 border-b border-ink/15">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-ink/[0.06]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-ink/[0.06]" />
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {daily.map((d) => (
              <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" title={`${d.day}: ${d.count} ${d.count === 1 ? "lead" : "leads"}`}>
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-moss-2 transition-colors group-hover:bg-racing"
                  style={{ height: d.count ? `${Math.max(3, (d.count / max) * 100)}%` : "0%" }}
                />
              </div>
            ))}
          </div>
        </div>
        <div />
        <div className="flex gap-[2px] font-mono text-[0.65rem] text-slate" aria-hidden>
          {daily.map((d, i) => (
            <span key={d.day} className="min-w-0 flex-1 text-center whitespace-nowrap">
              {i % every === 0 ? label(d.day) : ""}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">Leads received per day</figcaption>
      <details className="mt-4 text-xs text-slate">
        <summary className="w-fit cursor-pointer underline decoration-ink/20 underline-offset-4 hover:text-ink">Show as a table</summary>
        <table className="mt-2 w-full max-w-xs text-left">
          <thead>
            <tr>
              <th scope="col" className="py-1 font-medium">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Leads
              </th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {daily.map((d) => (
              <tr key={d.day} className="border-t border-ink/[0.06]">
                <td className="py-1">{d.day}</td>
                <td className="py-1 text-right text-ink">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function BreakdownTable({ title, rows, label }: { title: string; rows: Breakdown[]; label: (key: string) => React.ReactNode }) {
  return (
    <section aria-label={title} className={cardClass("overflow-hidden")}>
      <h2 className="border-b border-ink/[0.07] px-5 py-4 text-[0.95rem] font-semibold text-ink">{title}</h2>
      {rows.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-ivory/60">
              <tr>
                <th scope="col" className={th}>
                  {title.replace(/^By /, "").replace(/ \(.*\)$/, "")}
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Leads
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Offered
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Accepted
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Bought
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Lead → accepted
                </th>
                <th scope="col" className={clsx(th, "text-right")}>
                  Paid
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.06] font-mono text-[0.85rem] tabular-nums">
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className={clsx(td, "text-left font-sans text-sm font-normal text-ink")}>
                    {label(row.key)}
                  </th>
                  <td className={clsx(td, "text-right")}>{num(row.leads)}</td>
                  <td className={clsx(td, "text-right")}>{num(row.quoted)}</td>
                  <td className={clsx(td, "text-right")}>{num(row.accepted)}</td>
                  <td className={clsx(td, "text-right")}>{num(row.bought)}</td>
                  <td className={clsx(td, "text-right")}>{pct(ratio(row.accepted, row.leads))}</td>
                  <td className={clsx(td, "text-right")}>{row.boughtValue ? money(row.boughtValue) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-slate">No leads in this period.</p>
      )}
    </section>
  );
}

import { CircleCheck, Clock, Inbox, PoundSterling, Send, Timer, TrendingUp } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { LeadItem } from "@/components/admin/lead-bits";
import { btn } from "@/components/admin/styles";
import { BarList, Card, EmptyState, Kpi, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/guard";
import { duration, firstName, money, num, pct, plural } from "@/lib/admin/format";
import { getDashboard } from "@/lib/admin/queries";
import { channelLabel, LEAD_STATUSES, leadStatusMeta } from "@/lib/admin/status";
import { categoryLabel, type Category } from "@/lib/vehicles";
import { zonedParts } from "@/lib/admin/time";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date) {
  const { hour } = zonedParts(now);
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireAdminPage();
  const now = new Date();
  const d = await getDashboard(now);
  const { leads, offers } = d;

  const weekChange = leads.prevWeek > 0 ? (leads.week - leads.prevWeek) / leads.prevWeek : null;
  const oldestMs = leads.oldestAwaiting ? now.getTime() - leads.oldestAwaiting.getTime() : null;
  const conversion = offers.sellers > 0 ? offers.acceptedSellers / offers.sellers : null;
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).format(now);

  const summary =
    leads.stale > 0
      ? `${plural(leads.stale, "seller has", "sellers have")} waited more than 2 hours for a first reply.`
      : leads.awaiting > 0
        ? `${plural(leads.awaiting, "new lead")} to reply to, all inside 2 hours.`
        : "Everyone has had a first reply. Nice work.";

  const pipeline = (["new", "contacted", "quoted", "accepted"] as const).map((s) => ({ status: s, count: d.statusCounts[s] ?? 0 }));
  const pipelineTotal = pipeline.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today}
        title={`${greeting(now)}, ${firstName(user.name)}`}
        description={summary}
        actions={
          <Link href="/admin/leads?status=new" className={btn(leads.stale > 0 ? "primary" : "secondary", "md")}>
            <Inbox aria-hidden />
            Open new leads
          </Link>
        }
      />

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          label="New leads today"
          value={num(leads.today)}
          icon={<TrendingUp aria-hidden />}
          detail={
            <>
              {num(leads.week)} in the last 7 days
              {weekChange !== null ? (
                <span className="text-slate/80">
                  {" "}
                  · {weekChange >= 0 ? "+" : "−"}
                  {Math.abs(Math.round(weekChange * 100))}% on the week before
                </span>
              ) : null}
            </>
          }
        />
        <Kpi
          label="Awaiting first reply"
          value={num(leads.awaiting)}
          icon={<Clock aria-hidden />}
          tone={leads.stale > 0 ? "alert" : "default"}
          detail={oldestMs !== null ? `Oldest has waited ${duration(oldestMs)}` : "Nobody waiting"}
          href="/admin/leads?status=new&sort=oldest"
        />
        <Kpi label="Offers sent" value={num(offers.sent)} icon={<Send aria-hidden />} detail={`To ${plural(offers.sellers, "seller")} · last 30 days`} />
        <Kpi
          label="Offers accepted"
          value={num(offers.accepted)}
          icon={<CircleCheck aria-hidden />}
          tone={offers.accepted > 0 ? "good" : "default"}
          detail={offers.acceptedValue ? `${money(offers.acceptedValue)} agreed · last 30 days` : "Last 30 days"}
        />
        <Kpi
          label="Offer → accepted"
          value={pct(conversion)}
          icon={<PoundSterling aria-hidden />}
          detail={offers.sellers ? `${num(offers.acceptedSellers)} of ${plural(offers.sellers, "seller")} offered` : "No offers in the last 30 days"}
        />
        <Kpi
          label="Median first reply"
          value={leads.medianResponseSec !== null ? duration(leads.medianResponseSec * 1000) : "–"}
          icon={<Timer aria-hidden />}
          detail={leads.responded30 ? `Across ${plural(leads.responded30, "lead")} · last 30 days` : "No replies yet"}
        />
      </section>

      {pipelineTotal > 0 ? (
        <section aria-labelledby="pipeline-title" className="rounded-2xl border border-ink/[0.09] bg-bone px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="pipeline-title" className="text-[0.95rem] font-semibold text-ink">
              Open pipeline
            </h2>
            <p className="font-mono text-[0.78rem] text-slate tabular-nums">{plural(pipelineTotal, "lead")} in play</p>
          </div>
          <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-[4px]" aria-hidden>
            {pipeline
              .filter((p) => p.count > 0)
              .map((p) => (
                <span key={p.status} style={{ flexGrow: p.count, background: leadStatusMeta[p.status].bar }} className="min-w-1.5" title={`${leadStatusMeta[p.status].label}: ${p.count}`} />
              ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {pipeline.map((p) => (
              <li key={p.status}>
                <Link href={`/admin/leads?status=${p.status}` as Route} className="group inline-flex items-center gap-2 rounded-md">
                  <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: leadStatusMeta[p.status].bar }} />
                  <span className="text-slate group-hover:text-ink">{leadStatusMeta[p.status].label}</span>
                  <span className="font-mono font-medium text-ink tabular-nums">{p.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card
            id="attention"
            title="Needs attention"
            description="New leads waiting more than 2 hours, oldest first"
            action={
              leads.stale > d.attention.length ? (
                <Link href="/admin/leads?status=new&sort=oldest" className={btn("ghost", "sm")}>
                  All {leads.stale}
                </Link>
              ) : null
            }
            bodyClassName="p-2"
            className={leads.stale > 0 ? "border-signal/25" : undefined}
          >
            {d.attention.length ? (
              <ul className="divide-y divide-ink/[0.06]">
                {d.attention.map((lead) => (
                  <LeadItem key={lead.id} lead={lead} now={now} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={<CircleCheck aria-hidden />} title="Nobody is waiting">
                Every new lead has been answered inside 2 hours.
              </EmptyState>
            )}
          </Card>

          <Card
            id="recent"
            title="Recent leads"
            action={
              <Link href="/admin/leads" className={btn("ghost", "sm")}>
                View all
              </Link>
            }
            bodyClassName="p-2"
          >
            {d.recent.length ? (
              <ul className="divide-y divide-ink/[0.06]">
                {d.recent.map((lead) => (
                  <LeadItem key={lead.id} lead={lead} now={now} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Inbox aria-hidden />} title="No leads yet">
                When a seller sends their details from the website, they appear here.
              </EmptyState>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Leads by vehicle" description="Last 30 days">
            <BarList
              caption="Leads by vehicle type in the last 30 days"
              items={(["tesla", "ev", "van"] as Category[]).map((c) => ({
                key: c,
                label: categoryLabel[c],
                value: d.byCategory.find((r) => r.key === c)?.count ?? 0,
              }))}
            />
          </Card>
          <Card title="Leads by channel" description="Last 30 days">
            <BarList
              caption="Leads by marketing channel in the last 30 days"
              color="var(--color-brass)"
              items={d.byChannel.slice(0, 8).map((r) => ({ key: r.key, label: channelLabel(r.key), value: r.count }))}
            />
          </Card>
          <Card title="Status overview" description="All leads">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
              {LEAD_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/leads?status=${s}` as Route}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink/[0.07] bg-white/60 px-3 py-2 text-sm hover:border-ink/20"
                  >
                    <span className="flex items-center gap-2 text-slate">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: leadStatusMeta[s].bar }} />
                      {leadStatusMeta[s].label}
                    </span>
                    <span className="font-mono font-medium tabular-nums">{d.statusCounts[s] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

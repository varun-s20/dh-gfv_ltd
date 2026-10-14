import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Download, Inbox, SearchX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Age, ContactIcon, leadHref, PhotoCount } from "@/components/admin/lead-bits";
import { LeadFilterBar } from "@/components/admin/lead-filters";
import { btn, cardClass, tableWrap, td, th } from "@/components/admin/styles";
import { EmptyState, PageHeader, StatusPill } from "@/components/admin/ui";
import { Plate } from "@/components/ui/primitives";
import { dateTime, miles, money, num } from "@/lib/admin/format";
import { filtersToQuery, hasActiveFilters, PAGE_SIZE, parseLeadFilters, type LeadFilters } from "@/lib/admin/filters";
import { requireAdminPage } from "@/lib/admin/guard";
import { getFilterOptions, listLeads, statusCountsFor, type LeadListRow } from "@/lib/admin/queries";
import { categoryShort, channelLabel, contactLabel, LEAD_STATUSES, leadStatusMeta } from "@/lib/admin/status";

export const metadata: Metadata = { title: "Leads" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  const filters = parseLeadFilters(await searchParams);
  const now = new Date();
  const [{ rows, total }, options, counts] = await Promise.all([listLeads(filters), getFilterOptions(), statusCountsFor(filters)]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total ? (filters.page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(total, filters.page * PAGE_SIZE);
  const exportHref = `/api/admin/leads/export${filtersToQuery(filters, { page: 1 })}`;
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={hasActiveFilters(filters) ? `${num(total)} matching ${total === 1 ? "lead" : "leads"}.` : `${num(total)} ${total === 1 ? "lead" : "leads"} in total.`}
        actions={
          <a href={exportHref} className={btn("secondary", "md")} download>
            <Download aria-hidden />
            Export CSV
          </a>
        }
      />

      <LeadFilterBar key={filtersToQuery(filters)} filters={filters} channels={options.channels} campaigns={options.campaigns} />

      <nav aria-label="Status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-ink/10">
          <StatusTab href={`/admin/leads${filtersToQuery(filters, { status: undefined, page: 1 })}`} active={!filters.status} label="All" count={allCount} />
          {LEAD_STATUSES.map((s) => (
            <StatusTab
              key={s}
              href={`/admin/leads${filtersToQuery(filters, { status: s, page: 1 })}`}
              active={filters.status === s}
              label={leadStatusMeta[s].label}
              count={counts[s] ?? 0}
              dot={leadStatusMeta[s].bar}
            />
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className={cardClass()}>
          {hasActiveFilters(filters) ? (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title="No leads match"
              action={
                <Link href="/admin/leads" className={btn("secondary", "sm")}>
                  Clear filters
                </Link>
              }
            >
              Try a shorter search, or check the registration without spaces.
            </EmptyState>
          ) : (
            <EmptyState icon={<Inbox aria-hidden />} title="No leads yet">
              New quote requests from the website will appear here.
            </EmptyState>
          )}
        </div>
      ) : (
        <>
          {/* Phones: one card per lead */}
          <ul className="space-y-2.5 md:hidden">
            {rows.map((lead) => (
              <li key={lead.id}>
                <MobileLead lead={lead} now={now} />
              </li>
            ))}
          </ul>

          {/* Tablet and up: a dense table that scrolls inside its own frame */}
          <div className={cardClass("hidden overflow-hidden md:block")}>
            <div className={tableWrap}>
              <table className="w-full min-w-[60rem] border-collapse text-sm">
                <caption className="sr-only">
                  Leads {first} to {last} of {total}
                </caption>
                <thead className="border-b border-ink/[0.08] bg-ivory/60">
                  <tr>
                    <th scope="col" className={th}>
                      Vehicle
                    </th>
                    <th scope="col" className={th}>
                      Seller
                    </th>
                    <th scope="col" className={clsx(th, "text-right")}>
                      Mileage
                    </th>
                    <th scope="col" className={th}>
                      Received
                    </th>
                    <th scope="col" className={th}>
                      Status
                    </th>
                    <th scope="col" className={clsx(th, "text-right")}>
                      Offer
                    </th>
                    <th scope="col" className={th}>
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {rows.map((lead) => (
                    <tr key={lead.id} className="group relative transition-colors hover:bg-white/70">
                      <td className={clsx(td, "py-3.5")}>
                        <Link href={leadHref(lead.id)} className="flex items-center gap-3 rounded-md after:absolute after:inset-0 after:content-['']">
                          <Plate reg={lead.registration} size="sm" className="shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">
                              {lead.year} {lead.make} {lead.model}
                            </span>
                            <span className="block font-mono text-[0.72rem] text-slate">
                              {lead.ref} · {categoryShort[lead.category]}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={td}>
                        <span className="block max-w-[14rem] truncate text-ink">{lead.fullName}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate">
                          <ContactIcon pref={lead.contactPreference} />
                          {contactLabel[lead.contactPreference]}
                        </span>
                      </td>
                      <td className={clsx(td, "text-right font-mono text-[0.82rem] whitespace-nowrap tabular-nums")}>{miles(lead.mileage)}</td>
                      <td className={clsx(td, "whitespace-nowrap")}>
                        <span className="block text-[0.82rem] text-ink">{dateTime(lead.createdAt, now)}</span>
                        <span className="flex items-center gap-2">
                          <Age createdAt={lead.createdAt} now={now} status={lead.status} />
                          <PhotoCount count={lead.photoCount} />
                        </span>
                      </td>
                      <td className={td}>
                        <StatusPill status={lead.status} />
                      </td>
                      <td className={clsx(td, "text-right font-mono text-[0.85rem] whitespace-nowrap tabular-nums")}>
                        {lead.offerPence ? money(lead.offerPence) : <span className="text-slate/50">–</span>}
                      </td>
                      <td className={clsx(td, "whitespace-nowrap")}>
                        <span className="block text-[0.82rem] text-ink">{channelLabel(lead.channel)}</span>
                        {lead.utmCampaign ? <span className="block font-mono text-[0.72rem] text-slate">{lead.utmCampaign}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination filters={filters} page={filters.page} pages={pages} first={first} last={last} total={total} />
        </>
      )}
    </div>
  );
}

function StatusTab({ href, active, label, count, dot }: { href: string; active: boolean; label: string; count: number; dot?: string }) {
  return (
    <li>
      <Link
        href={href as Route}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "-mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap transition-colors",
          active ? "border-racing font-medium text-ink" : "border-transparent text-slate hover:border-ink/20 hover:text-ink",
        )}
      >
        {dot ? <span aria-hidden className="size-2 rounded-full" style={{ background: dot }} /> : null}
        {label}
        <span className={clsx("font-mono text-[0.75rem] tabular-nums", active ? "text-ink" : "text-slate/80")}>{count}</span>
      </Link>
    </li>
  );
}

function MobileLead({ lead, now }: { lead: LeadListRow; now: Date }) {
  return (
    <Link href={leadHref(lead.id)} className={cardClass("block p-4 active:bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <Plate reg={lead.registration} size="sm" />
        <StatusPill status={lead.status} />
      </div>
      <p className="mt-3 font-medium text-ink">
        {lead.year} {lead.make} {lead.model}
      </p>
      <p className="mt-0.5 text-sm text-slate">
        {lead.fullName} · <span className="font-mono tabular-nums">{miles(lead.mileage)}</span>
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/[0.07] pt-3 text-xs text-slate">
        <span className="flex items-center gap-3">
          <Age createdAt={lead.createdAt} now={now} status={lead.status} />
          <PhotoCount count={lead.photoCount} />
          <ContactIcon pref={lead.contactPreference} />
        </span>
        <span className="truncate">
          {lead.offerPence ? <span className="font-mono text-ink">{money(lead.offerPence)}</span> : channelLabel(lead.channel)}
        </span>
      </div>
    </Link>
  );
}

function Pagination({ filters, page, pages, first, last, total }: { filters: LeadFilters; page: number; pages: number; first: number; last: number; total: number }) {
  const prev = page > 1 ? `/admin/leads${filtersToQuery(filters, { page: page - 1 })}` : null;
  const next = page < pages ? `/admin/leads${filtersToQuery(filters, { page: page + 1 })}` : null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate">
        Showing <span className="font-mono text-ink tabular-nums">{first}</span>–<span className="font-mono text-ink tabular-nums">{last}</span> of{" "}
        <span className="font-mono text-ink tabular-nums">{total}</span>
      </p>
      <div className="flex gap-2">
        {prev ? (
          <Link href={prev as Route} className={btn("secondary", "sm")} rel="prev">
            <ChevronLeft aria-hidden />
            Previous
          </Link>
        ) : (
          <span className={btn("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled="true">
            <ChevronLeft aria-hidden />
            Previous
          </span>
        )}
        {next ? (
          <Link href={next as Route} className={btn("secondary", "sm")} rel="next">
            Next
            <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className={btn("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled="true">
            Next
            <ChevronRight aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

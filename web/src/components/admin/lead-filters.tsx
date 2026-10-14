"use client";

import { clsx } from "clsx";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { filtersToQuery, type LeadFilters } from "@/lib/admin/filters";
import { categoryShort, channelLabel, leadStatusMeta } from "@/lib/admin/status";
import { btn, inputClass, selectClass } from "./styles";

/**
 * Search and filters for the lead list. State lives in the URL: submitting
 * builds a clean query string (empty values dropped, page reset) and navigates,
 * so every view can be bookmarked or shared. Works as a plain GET form without JS.
 */
export function LeadFilterBar({ filters, channels, campaigns }: { filters: LeadFilters; channels: string[]; campaigns: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const advancedCount = [filters.category, filters.channel, filters.campaign, filters.from, filters.to].filter(Boolean).length + (filters.sort === "oldest" ? 1 : 0);
  const [showMore, setShowMore] = useState(advancedCount > 0);

  const go = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    const next: Partial<LeadFilters> = { page: 1, sort: data.get("sort") === "oldest" ? "oldest" : "newest" };
    for (const key of ["q", "status", "category", "channel", "campaign", "from", "to"] as const) {
      const value = String(data.get(key) ?? "").trim();
      if (value) (next as Record<string, string>)[key] = value;
    }
    startTransition(() => router.push(`/admin/leads${filtersToQuery(next)}` as Route, { scroll: false }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    go();
  };

  const hasAny = Boolean(filters.q || filters.status || advancedCount);

  return (
    <form ref={form} method="get" action="/admin/leads" onSubmit={onSubmit} role="search" aria-label="Filter leads" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <input
            id="lead-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Ref, name, registration, email or phone"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className={inputClass("h-11 pr-10 pl-9")}
          />
          {pending ? <LoaderCircle aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate motion-reduce:animate-none" /> : null}
        </div>
        {/* Status is chosen with the tabs below; keep it when searching. */}
        <input type="hidden" name="status" value={filters.status ?? ""} />
        <div className="flex gap-2">
          <button type="submit" className={btn("primary", "md", "h-11 flex-1 sm:flex-none")}>
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            aria-controls="lead-more-filters"
            className={btn("secondary", "md", "h-11 px-3.5")}
          >
            <SlidersHorizontal aria-hidden />
            <span className="max-sm:sr-only">Filters</span>
            {advancedCount ? <span className="rounded-full bg-racing px-1.5 font-mono text-[0.68rem] leading-4 text-ivory">{advancedCount}</span> : null}
          </button>
        </div>
      </div>

      <div id="lead-more-filters" hidden={!showMore} className="grid grid-cols-2 gap-2 rounded-xl border border-ink/[0.08] bg-bone/70 p-3 sm:grid-cols-3 lg:grid-cols-6">
        <FilterSelect id="f-category" name="category" label="Vehicle" value={filters.category} onChange={go} options={Object.entries(categoryShort).map(([v, l]) => [v, l])} any="Any vehicle" />
        <FilterSelect id="f-channel" name="channel" label="Channel" value={filters.channel} onChange={go} options={channels.map((c) => [c, channelLabel(c)])} any="Any channel" />
        <FilterSelect id="f-campaign" name="campaign" label="Campaign" value={filters.campaign} onChange={go} options={campaigns.map((c) => [c, c])} any="Any campaign" />
        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate">
            From
          </label>
          <input id="f-from" name="from" type="date" defaultValue={filters.from} onChange={go} className={inputClass("font-mono text-[0.85rem]")} />
        </div>
        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate">
            To
          </label>
          <input id="f-to" name="to" type="date" defaultValue={filters.to} onChange={go} className={inputClass("font-mono text-[0.85rem]")} />
        </div>
        <FilterSelect
          id="f-sort"
          name="sort"
          label="Order"
          value={filters.sort === "oldest" ? "oldest" : "newest"}
          onChange={go}
          options={[
            ["newest", "Newest first"],
            ["oldest", "Oldest first"],
          ]}
        />
      </div>

      {hasAny ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate">Filtered by</span>
          {filters.q ? <Chip>“{filters.q}”</Chip> : null}
          {filters.status ? <Chip>{leadStatusMeta[filters.status].label}</Chip> : null}
          {filters.category ? <Chip>{categoryShort[filters.category]}</Chip> : null}
          {filters.channel ? <Chip>{channelLabel(filters.channel)}</Chip> : null}
          {filters.campaign ? <Chip>{filters.campaign}</Chip> : null}
          {filters.from || filters.to ? (
            <Chip>
              {filters.from ?? "…"} → {filters.to ?? "today"}
            </Chip>
          ) : null}
          {filters.sort === "oldest" ? <Chip>Oldest first</Chip> : null}
          <Link href="/admin/leads" className={clsx(btn("ghost", "xs"), "text-slate")}>
            <X aria-hidden />
            Clear all
          </Link>
        </div>
      ) : null}
    </form>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-racing/[0.07] px-2.5 py-0.5 text-[0.8rem] text-racing">{children}</span>;
}

function FilterSelect({
  id,
  name,
  label,
  value,
  options,
  any,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  options: Array<[string, string]> | string[][];
  any?: string;
  onChange: () => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} onChange={onChange} className={selectClass("text-[0.88rem]")}>
        {any ? <option value="">{any}</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

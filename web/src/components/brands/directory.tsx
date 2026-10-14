"use client";

import { clsx } from "clsx";
import { Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Chevron } from "@/components/ui/primitives";
import type { MakeEntry } from "@/lib/vehicles";

type Filter = "all" | "cars" | "vans";

type Row = { make: string; cars: string[]; vans: string[] };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "");

/**
 * Every make we buy, A to Z, with a filter for cars or vans and a search that
 * matches makes and models ("ioniq", "e-transit"). A make that builds both shows
 * its cars and its vans together.
 */
export function BrandDirectory({ cars, vans }: { cars: MakeEntry[]; vans: MakeEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const searchId = useId();

  const rows = useMemo(() => {
    const byMake = new Map<string, Row>();
    for (const m of cars) byMake.set(m.make, { make: m.make, cars: m.models, vans: [] });
    for (const m of vans) {
      const row = byMake.get(m.make) ?? { make: m.make, cars: [], vans: [] };
      row.vans = m.models;
      byMake.set(m.make, row);
    }
    return [...byMake.values()].sort((a, b) => (a.make === "Tesla" ? -1 : b.make === "Tesla" ? 1 : a.make.localeCompare(b.make)));
  }, [cars, vans]);

  const q = norm(query);
  const shown = rows
    .map((r) => ({ ...r, cars: filter === "vans" ? [] : r.cars, vans: filter === "cars" ? [] : r.vans }))
    .filter((r) => r.cars.length + r.vans.length > 0)
    .map((r) => {
      if (!q || norm(r.make).includes(q)) return r;
      return { ...r, cars: r.cars.filter((m) => norm(m).includes(q)), vans: r.vans.filter((m) => norm(m).includes(q)) };
    })
    .filter((r) => r.cars.length + r.vans.length > 0);

  const counts = { all: rows.length, cars: rows.filter((r) => r.cars.length).length, vans: rows.filter((r) => r.vans.length).length };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show" className="inline-flex self-start rounded-2xl bg-carbon/[0.06] p-1">
          {(["all", "cars", "vans"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-xl px-4 py-2.5 text-[0.9rem] font-medium transition-[background-color,color,box-shadow] duration-300",
                filter === f ? "bg-pearl-50 text-carbon shadow-[0_1px_2px_rgb(13_15_18/0.12)]" : "text-carbon-2 hover:text-carbon",
              )}
            >
              {f === "all" ? "All makes" : f === "cars" ? "Cars" : "Vans"} <span className="text-carbon-3 tabular-nums">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label htmlFor={searchId} className="relative block w-full sm:w-80">
          <span className="sr-only">Search makes and models</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-carbon-3" strokeWidth={2} />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a make or model"
            autoComplete="off"
            className="h-12 w-full rounded-2xl bg-pearl-50 pr-4 pl-11 text-[0.95rem] text-carbon ring-1 ring-carbon/15 transition-shadow placeholder:text-carbon-3 focus:ring-2 focus:ring-ion-deep focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-6 text-[0.85rem] text-carbon-3" aria-live="polite">
        {shown.length ? `${shown.length} make${shown.length === 1 ? "" : "s"}` : "No match"}
      </p>

      {shown.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const href = r.make === "Tesla" ? "/sell-my-tesla" : r.cars.length ? "/sell-my-electric-car" : "/sell-my-electric-van";
            return (
              <li key={r.make}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-[1.4rem] bg-pearl-50 p-5 ring-1 ring-carbon/[0.07] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_1.25rem_2.5rem_-1.5rem_rgb(13_15_18/0.35)]"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-[1.3rem] font-medium tracking-[-0.025em]">{r.make}</span>
                    <span className="chip bg-carbon/[0.06] text-carbon transition-colors duration-300 group-hover:bg-carbon group-hover:text-pearl-50">
                      <Chevron />
                    </span>
                  </span>
                  {(
                    [
                      ["Cars", r.cars],
                      ["Vans", r.vans],
                    ] as const
                  ).map(([label, models]) =>
                    models.length ? (
                      <span key={label} className="mt-4 block">
                        {r.cars.length && r.vans.length ? <span className="label mb-2 block text-carbon-3">{label}</span> : null}
                        <span className="flex flex-wrap gap-1.5">
                          {models.map((m) => (
                            <span key={m} className="rounded-full bg-carbon/[0.05] px-3 py-1 text-[0.8rem] text-carbon-2">
                              {m}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : null,
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-[1.4rem] bg-pearl-50 p-8 ring-1 ring-carbon/[0.07]">
          <p className="font-display text-[1.3rem] font-medium tracking-[-0.025em]">Not on our list? We&apos;ll still price it.</p>
          <p className="mt-2 max-w-lg text-carbon-2">Choose &ldquo;Other&rdquo; in the form and tell us the make and model. A specialist will look at it like any other.</p>
          <Link href="/quote" className="label chev-link mt-5 text-carbon">
            Get my offer <Chevron />
          </Link>
        </div>
      )}
    </div>
  );
}

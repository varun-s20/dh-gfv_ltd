import { clsx } from "clsx";
import { ChartColumn, FileText, Inbox, LayoutDashboard, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

/** Presentational sidebar navigation, rendered by the static fallback and the live (pathname-aware) version. */

export const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Inbox, exact: false },
  { href: "/admin/reports", label: "Reports", icon: ChartColumn, exact: false },
  { href: "/admin/content", label: "Content", icon: FileText, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const satisfies ReadonlyArray<{ href: Route; label: string; exact: boolean; icon: unknown }>;

export type NavCounts = { fresh: number; stale: number };

export function isActive(pathname: string | null, href: string, exact: boolean) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavList({ pathname, counts }: { pathname: string | null; counts?: NavCounts }) {
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        const showCount = item.href === "/admin/leads" && counts && counts.fresh > 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[0.92rem] transition-colors duration-150",
                active ? "bg-white/[0.08] text-ivory" : "text-ivory/70 hover:bg-white/[0.04] hover:text-ivory",
              )}
            >
              <span
                aria-hidden
                className={clsx("absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-brass transition-opacity", active ? "opacity-100" : "opacity-0")}
              />
              <Icon aria-hidden className={clsx("size-[1.05rem] shrink-0", active ? "text-brass" : "text-sage group-hover:text-ivory/90")} strokeWidth={1.7} />
              <span className="flex-1">{item.label}</span>
              {showCount ? (
                <span className="flex items-center gap-1.5">
                  {counts.stale > 0 ? (
                    <span className="size-1.5 rounded-full bg-[#ff7a66]" title={`${counts.stale} waiting over 2 hours`}>
                      <span className="sr-only">, {counts.stale} waiting over 2 hours</span>
                    </span>
                  ) : null}
                  <span className="min-w-6 rounded-full bg-plate px-1.5 text-center font-mono text-[0.7rem] leading-5 font-semibold text-ink tabular-nums">
                    {counts.fresh}
                    <span className="sr-only"> new</span>
                  </span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

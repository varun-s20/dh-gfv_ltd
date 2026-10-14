import { clsx } from "clsx";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { leadStatusMeta, quoteStatusMeta, type LeadStatusValue, type QuoteStatusValue } from "@/lib/admin/status";
import { cardClass, pillBase } from "./styles";

/* ---------------------------------------------------------------- page scaffolding */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="eyebrow text-brass-deep">{eyebrow}</p> : null}
        <h1 className="display text-[2.35rem] leading-[1.02] text-ink sm:text-[2.75rem]">{title}</h1>
        {description ? <p className="max-w-2xl text-[0.95rem] text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag id={id} aria-labelledby={title && headingId ? headingId : undefined} className={cardClass(clsx("min-w-0 scroll-mt-20", className))}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-0.5 text-[0.82rem] text-slate">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {/* bodyClassName replaces the default padding (there is no class merging). */}
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </Tag>
  );
}

/* ---------------------------------------------------------------- state */

export function StatusPill({ status, className }: { status: LeadStatusValue; className?: string }) {
  const meta = leadStatusMeta[status];
  return (
    <span className={clsx(pillBase, meta.pill, className)}>
      <span aria-hidden className={clsx("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function QuotePill({ status, className }: { status: QuoteStatusValue; className?: string }) {
  const meta = quoteStatusMeta[status];
  return <span className={clsx(pillBase, meta.pill, status === "superseded" && "line-through decoration-slate/40", className)}>{meta.label}</span>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "warn" | "danger" | "ok" | "brass"; className?: string }) {
  const tones = {
    neutral: "bg-ink/[0.05] text-slate ring-ink/10",
    warn: "bg-amber-soft text-amber ring-amber/20",
    danger: "bg-signal-soft text-signal ring-signal/20",
    ok: "bg-ok-soft text-ok ring-ok/20",
    brass: "bg-[#f3e6cf] text-brass-deep ring-brass-deep/20",
  };
  return <span className={clsx(pillBase, tones[tone], className)}>{children}</span>;
}

/* ---------------------------------------------------------------- numbers */

export function Kpi({
  label,
  value,
  detail,
  tone = "default",
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "default" | "alert" | "good";
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8rem] font-medium text-slate">{label}</p>
        {icon ? <span className={clsx("[&_svg]:size-4", tone === "alert" ? "text-signal" : "text-brass-deep/70")}>{icon}</span> : null}
      </div>
      <p className="mt-2 font-mono text-[1.85rem] leading-none font-medium tracking-[-0.03em] text-ink">{value}</p>
      {detail ? <p className={clsx("mt-2 text-[0.8rem] leading-snug", tone === "alert" ? "font-medium text-signal" : "text-slate")}>{detail}</p> : null}
    </>
  );
  const cls = clsx(
    cardClass("relative block min-w-0 overflow-hidden p-4 sm:p-5"),
    tone === "alert" && "border-signal/30 bg-[linear-gradient(180deg,#fff7f5,var(--color-bone))]",
    tone === "good" && "border-ok/20",
    href && "transition-[border-color,box-shadow] hover:border-ink/25",
  );
  if (href) {
    return (
      <Link href={href as Route} className={cls}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

/**
 * Horizontal bars for a single series. One hue for every bar (identity is the
 * label, not the colour); value at the tip in ink; 4px rounded data end,
 * square at the baseline; native <title> tooltips.
 */
export function BarList({
  items,
  format = (n) => n.toLocaleString("en-GB"),
  color = "var(--color-moss-2)",
  emptyText = "Nothing in this period yet.",
  caption,
}: {
  items: Array<{ key: string; label: ReactNode; value: number; color?: string; title?: string }>;
  format?: (n: number) => string;
  color?: string;
  emptyText?: string;
  caption: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max === 0) return <p className="py-6 text-center text-sm text-slate">{emptyText}</p>;
  return (
    <figure>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-3">
        {items.map((item) => {
          const width = Math.max(1.5, (item.value / max) * 100);
          return (
            <li key={item.key} className="grid grid-cols-[minmax(6.5rem,9rem)_minmax(0,1fr)_3.25rem] items-center gap-3 text-sm">
              <span className="truncate text-ink">{item.label}</span>
              <svg className="h-3.5 w-full overflow-visible" aria-hidden role="presentation">
                <title>{item.title ?? `${format(item.value)}`}</title>
                <rect x="0" y="0" width="100%" height="100%" rx="4" fill="rgb(13 19 17 / 0.05)" />
                <BarRect width={width} fill={item.color ?? color} />
              </svg>
              <span className="text-right font-mono text-[0.82rem] tabular-nums text-ink">{format(item.value)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/** A bar whose data end is rounded and whose baseline is square (two rects). */
function BarRect({ width, fill }: { width: number; fill: string }) {
  return (
    <>
      <rect x="0" y="0" width={`${width}%`} height="100%" rx="4" fill={fill} />
      <rect x="0" y="0" width={`${Math.min(width, 2)}%`} height="100%" fill={fill} />
    </>
  );
}

/* ---------------------------------------------------------------- details */

export function Facts({ items, columns = 2, className }: { items: Array<[string, ReactNode]>; columns?: 1 | 2 | 3; className?: string }) {
  const visible = items.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  if (!visible.length) return <p className="text-sm text-slate">Nothing recorded.</p>;
  return (
    <dl className={clsx("grid gap-x-5 gap-y-3.5", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-2 xl:grid-cols-3", className)}>
      {visible.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[0.72rem] font-medium tracking-wide text-slate uppercase">{label}</dt>
          <dd className="mt-0.5 text-[0.92rem] break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, children, icon, action }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon ? <span className="mb-3 grid size-11 place-items-center rounded-full bg-ink/[0.05] text-slate [&_svg]:size-5">{icon}</span> : null}
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-slate">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("font-mono text-[0.92em] tabular-nums", className)}>{children}</span>;
}

/** Skeleton block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-lg bg-ink/[0.06] motion-reduce:animate-none", className)} />;
}

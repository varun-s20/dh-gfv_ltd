import { clsx } from "clsx";
import { Camera, Mail, MessageCircle, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Plate } from "@/components/ui/primitives";
import { duration, miles } from "@/lib/admin/format";
import type { LeadCard } from "@/lib/admin/queries";
import { categoryShort, channelLabel, contactLabel } from "@/lib/admin/status";
import { StatusPill } from "./ui";

export const leadHref = (id: string) => `/admin/leads/${id}` as Route;

export function ContactIcon({ pref, className }: { pref: string; className?: string }) {
  const Icon = pref === "whatsapp" ? MessageCircle : pref === "phone" ? Phone : Mail;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-slate", className)} title={`Prefers ${contactLabel[pref] ?? pref}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={1.8} />
      <span className="sr-only">Prefers {contactLabel[pref] ?? pref}</span>
    </span>
  );
}

/** Lead age, turning signal-red once a new lead has waited over two hours. */
export function Age({ createdAt, now, status, className }: { createdAt: Date; now: Date; status: string; className?: string }) {
  const ms = now.getTime() - createdAt.getTime();
  const late = status === "new" && ms > 2 * 3_600_000;
  return (
    <span className={clsx("font-mono text-[0.78rem] tabular-nums", late ? "font-medium text-signal" : "text-slate", className)} title={createdAt.toISOString()}>
      {duration(ms)}
      <span className="sr-only"> old</span>
    </span>
  );
}

export function PhotoCount({ count }: { count: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 font-mono text-[0.78rem] tabular-nums", count ? "text-slate" : "text-slate/50")} title={`${count} photos`}>
      <Camera aria-hidden className="size-3.5" strokeWidth={1.8} />
      {count}
      <span className="sr-only"> photos</span>
    </span>
  );
}

/** A compact, tappable lead summary for dashboard lists. Wraps onto two lines on a phone. */
export function LeadItem({ lead, now }: { lead: LeadCard; now: Date }) {
  return (
    <li>
      <Link href={leadHref(lead.id)} className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-ink/[0.035] sm:items-center sm:gap-4 sm:px-4">
        <Plate reg={lead.registration} size="sm" className="mt-0.5 shrink-0 whitespace-nowrap sm:mt-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-[0.92rem] font-medium text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">
              {lead.year} {lead.make} {lead.model}
            </span>
            <StatusPill status={lead.status} className="shrink-0" />
          </span>
          <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.8rem] text-slate">
            <span className="flex min-w-0 items-center gap-x-2">
              <span className="truncate">{lead.fullName}</span>
              <span aria-hidden className="text-ink/20">·</span>
              <span className="shrink-0 font-mono tabular-nums">{miles(lead.mileage)}</span>
              <span className="hidden shrink-0 sm:inline">· {categoryShort[lead.category]}</span>
              <span className="hidden shrink-0 lg:inline">· {channelLabel(lead.channel)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <ContactIcon pref={lead.contactPreference} />
              <PhotoCount count={lead.photoCount} />
              <Age createdAt={lead.createdAt} now={now} status={lead.status} />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

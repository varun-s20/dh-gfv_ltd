import { clsx } from "clsx";
import { BadgeCheck, CircleDot, Info, Mail, MessageCircle, MessageCircleReply, PoundSterling, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import { dateTime, money } from "@/lib/admin/format";
import { templateLabel } from "@/lib/admin/labels";
import { LEAD_STATUSES, messageStatusMeta, type LeadStatusValue } from "@/lib/admin/status";
import type { LeadEvent, Message } from "@/lib/db/schema";
import { StatusPill } from "./ui";

type Item = { key: string; at: Date } & ({ type: "event"; event: LeadEvent } | { type: "message"; message: Message });

/**
 * One feed for everything that happened to a lead, newest first: status
 * changes, notes, offers, inbound WhatsApp and every outbound message with
 * its live delivery status (updated by the WhatsApp webhook).
 */
export function buildTimeline(events: LeadEvent[], messages: Message[]): Item[] {
  const messageIds = new Set(messages.map((m) => m.id));
  const items: Item[] = [];
  for (const event of events) {
    // Message events are shown through the message row itself, which carries the current status.
    if (event.data.kind === "message" && messageIds.has(event.data.messageId)) continue;
    items.push({ key: `e-${event.id}`, at: event.createdAt, type: "event", event });
  }
  for (const message of messages) items.push({ key: `m-${message.id}`, at: message.createdAt, type: "message", message });
  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

const isStatus = (s: string): s is LeadStatusValue => (LEAD_STATUSES as readonly string[]).includes(s);

export function Timeline({ items, now }: { items: Item[]; now: Date }) {
  if (!items.length) return <p className="py-4 text-sm text-slate">Nothing has happened yet.</p>;
  return (
    <ol className="relative space-y-0">
      {items.map((item, i) => (
        <li key={item.key} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
          {i < items.length - 1 ? <span aria-hidden className="absolute top-8 bottom-0 left-[0.97rem] w-px bg-ink/10" /> : null}
          {item.type === "message" ? <MessageItem message={item.message} now={now} /> : <EventItem event={item.event} now={now} />}
        </li>
      ))}
    </ol>
  );
}

function Dot({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brass" | "ok" | "signal" | "racing" | "inbound" }) {
  const tones = {
    neutral: "bg-white text-slate ring-ink/10",
    brass: "bg-[#f3e6cf] text-brass-deep ring-brass-deep/15",
    ok: "bg-ok-soft text-ok ring-ok/20",
    signal: "bg-signal-soft text-signal ring-signal/20",
    racing: "bg-racing text-brass ring-racing",
    inbound: "bg-[#d9f2d0] text-ok ring-ok/20",
  };
  return <span className={clsx("relative z-[1] grid size-8 place-items-center rounded-full ring-1 [&_svg]:size-3.5", tones[tone])}>{children}</span>;
}

function Meta({ who, at, now }: { who?: string | null; at: Date; now: Date }) {
  return (
    <p className="mt-0.5 text-xs text-slate">
      {who ? <span>{who} · </span> : null}
      <time dateTime={at.toISOString()} className="font-mono tabular-nums">
        {dateTime(at, now)}
      </time>
    </p>
  );
}

function EventItem({ event, now }: { event: LeadEvent; now: Date }) {
  const d = event.data;
  const who = event.actorName;

  if (event.type === "whatsapp-inbound") {
    return (
      <>
        <Dot tone="inbound">
          <MessageCircleReply aria-hidden />
        </Dot>
        <div className="min-w-0 pt-1">
          <p className="text-sm text-ink">
            <span className="font-medium">{who ?? "Seller"}</span> replied on WhatsApp
          </p>
          <Meta at={event.createdAt} now={now} />
          {d.kind === "system" ? <p className="mt-2 max-w-prose rounded-2xl rounded-tl-md bg-[#d9f2d0] px-3.5 py-2 text-sm text-ink">{d.body}</p> : null}
        </div>
      </>
    );
  }

  switch (d.kind) {
    case "status":
      return (
        <>
          <Dot>
            <CircleDot aria-hidden />
          </Dot>
          <div className="min-w-0 pt-1">
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
              Status changed {isStatus(d.from) ? <StatusPill status={d.from} className="scale-95 opacity-70" /> : d.from}
              <span aria-hidden className="text-slate">→</span>
              <span className="sr-only">to</span>
              {isStatus(d.to) ? <StatusPill status={d.to} /> : d.to}
            </p>
            <Meta who={who} at={event.createdAt} now={now} />
          </div>
        </>
      );
    case "note":
      return (
        <>
          <Dot tone="brass">
            <StickyNote aria-hidden />
          </Dot>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-medium text-ink">Note</p>
            <Meta who={who} at={event.createdAt} now={now} />
            <p className="mt-2 max-w-prose rounded-xl border border-brass/25 bg-[#fbf3e3] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-ink">{d.body}</p>
          </div>
        </>
      );
    case "quote": {
      const accepted = d.action.startsWith("accepted");
      const declined = d.action.startsWith("declined");
      return (
        <>
          <Dot tone={accepted ? "ok" : declined ? "signal" : "brass"}>
            <PoundSterling aria-hidden />
          </Dot>
          <div className="min-w-0 pt-1">
            <p className="text-sm text-ink">
              Offer <span className="font-mono">v{d.version}</span> <span className="font-mono font-medium">{money(d.amountPence)}</span> {d.action}
            </p>
            <Meta who={who} at={event.createdAt} now={now} />
          </div>
        </>
      );
    }
    case "message":
      return (
        <>
          <Dot>{d.channel === "whatsapp" ? <MessageCircle aria-hidden /> : <Mail aria-hidden />}</Dot>
          <div className="min-w-0 pt-1">
            <p className="text-sm text-ink">{d.status}</p>
            <Meta who={who} at={event.createdAt} now={now} />
          </div>
        </>
      );
    default:
      return (
        <>
          <Dot tone={event.type === "purchase" ? "racing" : "neutral"}>{event.type === "purchase" ? <BadgeCheck aria-hidden /> : <Info aria-hidden />}</Dot>
          <div className="min-w-0 pt-1">
            <p className={clsx("text-sm text-ink", event.type === "purchase" && "font-medium")}>{d.body}</p>
            <Meta who={who} at={event.createdAt} now={now} />
          </div>
        </>
      );
  }
}

function MessageItem({ message, now }: { message: Message; now: Date }) {
  const status = messageStatusMeta[message.status] ?? { label: message.status, tone: "text-slate" };
  const failed = message.status === "failed";
  return (
    <>
      <Dot tone={failed ? "signal" : "neutral"}>{message.channel === "whatsapp" ? <MessageCircle aria-hidden /> : <Mail aria-hidden />}</Dot>
      <div className="min-w-0 pt-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink">
          <span>{templateLabel(message.template)}</span>
          <span className={clsx("font-mono text-[0.72rem] tracking-wide uppercase", status.tone)}>{status.label}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-slate">
          {message.direction === "inbound" ? "From" : "To"} <span className="font-mono">{message.recipient}</span> ·{" "}
          <time dateTime={message.createdAt.toISOString()} className="font-mono tabular-nums">
            {dateTime(message.createdAt, now)}
          </time>
        </p>
        {failed && message.error ? <p className="mt-1.5 text-xs font-medium text-signal">{message.error}</p> : null}
        {message.subject || message.preview ? (
          <details className="group mt-1.5">
            <summary className="w-fit cursor-pointer list-none rounded text-xs text-slate underline decoration-ink/20 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show message</span>
              <span className="hidden group-open:inline">Hide message</span>
            </summary>
            <div className="mt-2 max-w-prose rounded-xl border border-ink/[0.08] bg-white px-3.5 py-2.5 text-[0.82rem] leading-relaxed text-slate">
              {message.subject ? <p className="mb-1 font-medium text-ink">{message.subject}</p> : null}
              <p className="whitespace-pre-line">{message.preview}</p>
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}

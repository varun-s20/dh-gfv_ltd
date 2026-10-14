import { clsx } from "clsx";
import { ArrowLeft, Camera, Mail, MessageCircle, Phone, PoundSterling } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CopyButton } from "@/components/admin/copy-button";
import { ContactLink, MarkContacted, NoteForm, PurchaseForm, StatusControl } from "@/components/admin/lead-actions";
import { PhotoGallery } from "@/components/admin/photo-gallery";
import { QuoteBuilder } from "@/components/admin/quote-builder";
import { btn } from "@/components/admin/styles";
import { buildTimeline, Timeline } from "@/components/admin/timeline";
import { Badge, Card, EmptyState, Facts, Mono, QuotePill } from "@/components/admin/ui";
import { Plate } from "@/components/ui/primitives";
import { dateTime, duration, firstName, miles, money, moneyExact, num, shortDate } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/guard";
import {
  batterySourceLabel,
  cableLabel,
  conditionLabel,
  damageLabel,
  eapLabel,
  financeLabel,
  fsdLabel,
  intentLabel,
  sellerTypeLabel,
  serviceLabel,
  vanFeatureLabel,
  writeOffLabel,
  yesNo,
} from "@/lib/admin/labels";
import { offerPreviewTemplate } from "@/lib/admin/preview";
import { getLeadDetail } from "@/lib/admin/queries";
import { getSetting } from "@/lib/admin/settings";
import { channelLabel, contactLabel, effectiveQuoteStatus } from "@/lib/admin/status";
import type { Lead, Quote } from "@/lib/db/schema";
import { PHOTO_SLOTS } from "@/lib/leads/form-schema";
import { whatsappConfigured } from "@/lib/notify/providers";
import { ukDate } from "@/lib/notify/templates";
import { categoryLabel, formatReg } from "@/lib/vehicles";

export const metadata: Metadata = { title: "Lead" };

type Params = Promise<{ id: string }>;

const slotLabel = (slot: string | null, i: number) => PHOTO_SLOTS.find((s) => s.id === slot)?.label ?? `Photo ${i + 1}`;

/** "+447700900123" → "07700 900123" for reading aloud on the phone. */
function ukPhone(e164: string) {
  if (!e164.startsWith("+44")) return e164;
  const local = `0${e164.slice(3)}`;
  return local.length === 11 ? `${local.slice(0, 5)} ${local.slice(5)}` : local;
}

export default async function LeadPage({ params }: { params: Params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [detail, quoteDefaults] = await Promise.all([getLeadDetail(id), getSetting("quote.defaults")]);
  if (!detail) notFound();
  const { lead, photos, events, messages, quotes } = detail;
  const now = new Date();

  const draft = quotes.find((q) => q.status === "draft") ?? null;
  const live = quotes.find((q) => effectiveQuoteStatus(q.status, q.validUntil, now) === "sent" || effectiveQuoteStatus(q.status, q.validUntil, now) === "viewed") ?? null;
  const accepted = quotes.find((q) => q.status === "accepted") ?? null;
  const latestOffer = quotes.find((q) => q.status !== "superseded" && q.status !== "draft") ?? null;
  const first = firstName(lead.fullName);
  const waText = `Hi ${first}, it's ${firstName(user.name)} at Green Future about your ${lead.make} ${lead.model} (ref ${lead.ref}).`;
  const ageMs = now.getTime() - lead.createdAt.getTime();
  const late = lead.status === "new" && ageMs > 2 * 3_600_000;
  const timeline = buildTimeline(events, messages);

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className={btn("ghost", "sm", "-ml-3 text-slate")}>
        <ArrowLeft aria-hidden />
        All leads
      </Link>

      {/* Header: who, what, where it stands, and one-tap contact */}
      <header className="space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <Plate reg={lead.registration} size="lg" className="shrink-0 self-start whitespace-nowrap" />
            <div className="min-w-0">
              <h1 className="display text-[2.1rem] leading-[1.02] sm:text-[2.6rem]">
                {lead.year} {lead.make} {lead.model}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
                {lead.variant ? <span>{lead.variant}</span> : null}
                {lead.colour ? <span>{lead.colour}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <Mono className="text-ink">{lead.ref}</Mono>
                  <CopyButton value={lead.ref} label="Copy reference" />
                </span>
                <span>
                  Received {dateTime(lead.createdAt, now)} ·{" "}
                  <span className={clsx("font-mono tabular-nums", late && "font-medium text-signal")}>{duration(ageMs)} ago</span>
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {lead.status === "new" ? <MarkContacted leadId={lead.id} /> : null}
            <StatusControl leadId={lead.id} status={lead.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ContactLink href={`tel:${lead.phone}`} label={`Call ${ukPhone(lead.phone)}`} icon={<Phone aria-hidden />} primary={lead.contactPreference === "phone"} />
          <ContactLink
            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`}
            label="WhatsApp"
            icon={<MessageCircle aria-hidden />}
            primary={lead.contactPreference === "whatsapp"}
            external
          />
          <ContactLink
            href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your ${lead.make} ${lead.model} · ref ${lead.ref}`)}`}
            label="Email"
            icon={<Mail aria-hidden />}
            primary={lead.contactPreference === "email"}
          />
          <a href="#offer" className={btn("ghost", "md", "flex-1 sm:flex-none xl:hidden")}>
            <PoundSterling aria-hidden />
            {latestOffer || draft ? "Offer" : "Make an offer"}
          </a>
          <p className="flex w-full items-center text-[0.82rem] text-slate sm:ml-2 sm:w-auto">
            {first} prefers <strong className="ml-1 font-medium text-ink">{contactLabel[lead.contactPreference]}</strong>
          </p>
        </div>

        {/* Summary strip */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/[0.09] bg-ink/[0.07] sm:grid-cols-4 xl:grid-cols-7">
          <Stat label="Mileage" value={<Mono>{miles(lead.mileage)}</Mono>} />
          <Stat label="Condition" value={conditionLabel(lead.condition)} warn={lead.condition === "poor" || lead.damage === "major"} />
          <Stat label="Battery health" value={lead.batteryHealth ? <Mono>{lead.batteryHealth}%</Mono> : "Not given"} muted={!lead.batteryHealth} />
          <Stat label="Finance" value={financeLabel(lead.finance)} warn={lead.finance !== "none"} />
          <Stat label="Photos" value={<Mono>{photos.length}</Mono>} muted={!photos.length} />
          <Stat label="Postcode" value={<Mono>{lead.postcode}</Mono>} />
          <Stat
            label={accepted ? "Accepted" : "Latest offer"}
            value={latestOffer ? <Mono className={accepted ? "text-ok" : undefined}>{money(latestOffer.amountPence)}</Mono> : "None yet"}
            muted={!latestOffer}
          />
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_27rem]">
        {/* Main column, top: photos and the seller's answers */}
        <div className="min-w-0 space-y-6 xl:col-start-1">
          <Card title="Photos" description={photos.length ? `${photos.length} from the seller` : undefined} id="photos">
            {photos.length ? (
              <PhotoGallery photos={photos.map((p, i) => ({ id: p.id, label: slotLabel(p.slot, i), width: p.width, height: p.height }))} />
            ) : (
              <EmptyState icon={<Camera aria-hidden />} title="No photos">
                Ask {first} to send a few on WhatsApp before pricing.
              </EmptyState>
            )}
          </Card>
          <LeadDetails lead={lead} />
        </div>

        {/* Side column: offers */}
        <div className="min-w-0 space-y-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <Card title={draft ? "Finish the offer" : live ? "Revise the offer" : "Make an offer"} id="offer" className="ring-1 ring-racing/10">
            <QuoteBuilder
              key={`${quotes[0]?.id ?? "none"}:${quotes[0]?.status ?? ""}:${quotes[0]?.updatedAt.getTime() ?? 0}`}
              leadId={lead.id}
              template={offerPreviewTemplate(lead)}
              defaults={quoteDefaults}
              draft={
                draft
                  ? {
                      id: draft.id,
                      version: draft.version,
                      amountPence: draft.amountPence,
                      conditions: draft.conditions,
                      internalNotes: draft.internalNotes,
                      validDays: Math.max(1, Math.min(30, Math.round((draft.validUntil.getTime() - draft.createdAt.getTime()) / 86_400_000))),
                    }
                  : null
              }
              live={live ? { version: live.version, amountPence: live.amountPence, status: effectiveQuoteStatus(live.status, live.validUntil, now), sentAt: live.sentAt?.toISOString() ?? null } : null}
              prefers={lead.contactPreference}
              whatsappReady={whatsappConfigured()}
              validDates={Array.from({ length: 30 }, (_, i) => ukDate(new Date(now.getTime() + (i + 1) * 86_400_000)))}
              sellerFirstName={first}
              sellerEmail={lead.email}
              sellerPhone={ukPhone(lead.phone)}
            />
          </Card>

          <Card title="Offer history" description={quotes.length ? `${quotes.length} ${quotes.length === 1 ? "version" : "versions"}` : undefined} id="history" bodyClassName="p-0">
            {quotes.length ? (
              <ol className="divide-y divide-ink/[0.06]">
                {quotes.map((q) => (
                  <QuoteRow key={q.id} quote={q} now={now} />
                ))}
              </ol>
            ) : (
              <p className="px-5 py-6 text-sm text-slate">No offers yet. Drafts and sent offers appear here with their status.</p>
            )}
          </Card>

          <Card
            title={lead.purchasePricePence ? "Purchase" : "Record purchase"}
            description={lead.purchasePricePence ? undefined : "When the car is collected and paid for"}
            id="purchase"
            className={lead.status === "accepted" ? "border-ok/30" : undefined}
          >
            {lead.purchasePricePence ? (
              <p className="mb-4 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
                Bought for <strong className="font-mono">{moneyExact(lead.purchasePricePence)}</strong>
                {lead.closedAt ? ` on ${shortDate(lead.closedAt)}` : ""}.
              </p>
            ) : lead.status === "accepted" ? (
              <p className="mb-4 text-sm text-slate">{first} accepted. Once the car is collected and paid for, record the final price here to close the lead.</p>
            ) : null}
            <PurchaseForm leadId={lead.id} suggestedPence={accepted?.amountPence ?? null} recordedPence={lead.purchasePricePence} />
          </Card>

          <Card title="Where they came from" id="attribution">
            <Facts
              columns={1}
              items={[
                ["Channel", channelLabel(lead.channel)],
                ["Campaign", lead.utmCampaign ? <Mono>{lead.utmCampaign}</Mono> : null],
                ["Source / medium", lead.utmSource || lead.utmMedium ? <Mono>{[lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ")}</Mono> : null],
                ["Keyword", lead.utmTerm],
                ["Ad content", lead.utmContent],
                [
                  "Google click ID",
                  lead.gclid ? (
                    <span className="flex items-center gap-1">
                      <Mono className="truncate">{lead.gclid}</Mono>
                      <CopyButton value={lead.gclid} label="Copy gclid" />
                    </span>
                  ) : null,
                ],
                ["gbraid / wbraid", lead.gbraid || lead.wbraid ? <Mono>{[lead.gbraid, lead.wbraid].filter(Boolean).join(" / ")}</Mono> : null],
                ["Facebook click ID", lead.fbclid ? <Mono className="break-all">{lead.fbclid}</Mono> : null],
                ["Landing page", lead.landingPage ? <Mono className="break-all">{lead.landingPage}</Mono> : null],
                ["Referrer", lead.referrer ? <Mono className="break-all">{lead.referrer}</Mono> : "None (typed or bookmarked)"],
              ]}
            />
          </Card>
        </div>

        {/* Main column, bottom: everything that happened */}
        <Card title="Timeline" description="Newest first" id="timeline" className="min-w-0 xl:col-start-1">
          <div className="mb-6">
            <NoteForm leadId={lead.id} />
          </div>
          <Timeline items={timeline} now={now} />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, warn, muted }: { label: string; value: React.ReactNode; warn?: boolean; muted?: boolean }) {
  return (
    <div className="bg-bone px-4 py-3 last:col-span-2 xl:last:col-span-1">
      <dt className="text-[0.7rem] font-medium tracking-wide text-slate uppercase">{label}</dt>
      <dd className={clsx("mt-1 text-[0.95rem] font-medium", warn ? "text-amber" : muted ? "text-slate/70" : "text-ink")}>{value}</dd>
    </div>
  );
}

function LeadDetails({ lead }: { lead: Lead }) {
  const x = lead.extras ?? {};
  const isTesla = lead.category === "tesla";
  const isVan = lead.category === "van";
  return (
    <Card title="Seller's answers" id="details" bodyClassName="divide-y divide-ink/[0.07] p-0">
      <Section title="Vehicle">
        <Facts
          columns={3}
          items={[
            ["Registration", <Mono key="r">{formatReg(lead.registration)}</Mono>],
            ["Type", categoryLabel[lead.category]],
            ["Make and model", `${lead.make} ${lead.model}`],
            ["Variant", lead.variant],
            ["Year", <Mono key="y">{lead.year}</Mono>],
            ["Mileage", <Mono key="m">{num(lead.mileage)} miles</Mono>],
            ["Colour", lead.colour],
            ["Keys or key cards", lead.keys ? <Mono key="k">{lead.keys}</Mono> : null],
            ["Charging cables", x.cables?.length ? x.cables.map(cableLabel).join(", ") : null],
          ]}
        />
      </Section>
      <Section title="Condition and battery">
        <Facts
          columns={3}
          items={[
            ["Overall condition", conditionLabel(lead.condition)],
            ["Damage", damageLabel(lead.damage)],
            ["Write-off", writeOffLabel(lead.writeOff)],
            ["Warning lights", yesNo(lead.warningLights, "Yes, on the dash", "None")],
            ["Service history", serviceLabel(lead.serviceHistory)],
            ["Battery health", lead.batteryHealth ? `${lead.batteryHealth}%${lead.batteryHealthSource ? ` (${batterySourceLabel(lead.batteryHealthSource)})` : ""}` : "Not given"],
            ["Battery lease", x.batteryLeased === undefined ? null : yesNo(x.batteryLeased, "Leased battery", "Owned")],
          ]}
        />
        {lead.damageDetails ? (
          <p className="mt-4 rounded-xl border border-amber/20 bg-amber-soft/60 px-3.5 py-2.5 text-sm text-ink">
            <span className="font-medium">Damage described: </span>
            {lead.damageDetails}
          </p>
        ) : null}
      </Section>
      <Section title="Ownership and finance">
        <Facts
          columns={3}
          items={[
            ["Registered keeper", yesNo(lead.isRegisteredKeeper, "Yes", "No, someone else")],
            ["Finance", financeLabel(lead.finance)],
            ["Lender", lead.financeLender],
            ["Settlement (approx.)", lead.financeSettlementPence ? <Mono key="s">{money(lead.financeSettlementPence)}</Mono> : null],
            ["Wants to", intentLabel(lead.intent)],
            ["Seller", sellerTypeLabel(lead.sellerType)],
          ]}
        />
      </Section>
      {isTesla ? (
        <Section title="Tesla extras">
          <Facts
            columns={3}
            items={[
              ["Full Self-Driving", fsdLabel(x.fsd) ?? "Not asked"],
              ["Enhanced Autopilot", eapLabel(x.eap) ?? "Not asked"],
              ["Acceleration Boost", yesNo(x.accelerationBoost, "Yes", "No")],
            ]}
          />
        </Section>
      ) : null}
      {isVan || lead.sellerType === "business" ? (
        <Section title={isVan ? "Van and business" : "Business"}>
          <Facts
            columns={3}
            items={[
              ["Business name", lead.businessName],
              ["VAT qualifying", yesNo(x.vatQualifying, "Yes", "No")],
              ["Vehicles to sell", x.vehicleCount ? <Mono key="c">{x.vehicleCount}</Mono> : null],
              ["Fitted", x.vanFeatures?.length ? x.vanFeatures.map(vanFeatureLabel).join(", ") : isVan ? "Nothing listed" : null],
            ]}
          />
        </Section>
      ) : null}
      <Section title="Seller's notes">
        {lead.sellerNotes ? <p className="max-w-prose text-[0.92rem] leading-relaxed whitespace-pre-line text-ink">{lead.sellerNotes}</p> : <p className="text-sm text-slate">No notes.</p>}
      </Section>
      <Section title="Contact">
        <Facts
          columns={3}
          items={[
            ["Name", lead.fullName],
            [
              "Email",
              <span key="e" className="inline-flex items-center gap-1">
                <a href={`mailto:${lead.email}`} className="break-all underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                  {lead.email}
                </a>
                <CopyButton value={lead.email} label="Copy email" />
              </span>,
            ],
            [
              "Phone",
              <span key="p" className="inline-flex items-center gap-1">
                <a href={`tel:${lead.phone}`} className="font-mono underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
                  {ukPhone(lead.phone)}
                </a>
                <CopyButton value={lead.phone} label="Copy phone number" />
              </span>,
            ],
            ["Postcode", <Mono key="pc">{lead.postcode}</Mono>],
            ["Prefers", contactLabel[lead.contactPreference]],
            ["Marketing", lead.marketingOptIn ? <Badge tone="ok">Opted in</Badge> : "Not opted in"],
          ]}
        />
      </Section>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-5">
      <h3 className="mb-3.5 font-mono text-[0.68rem] tracking-[0.14em] text-brass-deep uppercase">{title}</h3>
      {children}
    </section>
  );
}

function QuoteRow({ quote: q, now }: { quote: Quote; now: Date }) {
  const status = effectiveQuoteStatus(q.status, q.validUntil, now);
  return (
    <li className={clsx("px-5 py-4", status === "superseded" && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-xs text-slate">v{q.version}</span>
            <span className={clsx("font-mono text-lg font-medium tabular-nums", status === "accepted" ? "text-ok" : "text-ink")}>{money(q.amountPence)}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate">
            {q.createdByName ? `${q.createdByName} · ` : ""}
            {dateTime(q.createdAt, now)}
          </p>
        </div>
        <QuotePill status={status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {q.sentAt ? <Pair label="Sent" value={`${dateTime(q.sentAt, now)}${q.sentVia.length ? ` · ${q.sentVia.map((c) => (c === "whatsapp" ? "WhatsApp" : "email")).join(" + ")}` : ""}`} /> : null}
        {q.sentAt || q.status !== "draft" ? <Pair label={status === "expired" ? "Expired" : "Valid until"} value={shortDate(q.validUntil)} /> : null}
        {q.viewedAt ? <Pair label="Viewed" value={dateTime(q.viewedAt, now)} /> : null}
        {q.respondedAt ? <Pair label={q.status === "accepted" ? "Accepted" : "Responded"} value={dateTime(q.respondedAt, now)} /> : null}
      </dl>
      {q.declineReason ? <p className="mt-2.5 rounded-lg bg-signal-soft px-3 py-2 text-xs text-signal">“{q.declineReason}”</p> : null}
      {q.conditions || q.internalNotes ? (
        <details className="group mt-2.5 text-xs">
          <summary className="w-fit cursor-pointer list-none text-slate underline decoration-ink/20 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Conditions and notes</span>
            <span className="hidden group-open:inline">Hide</span>
          </summary>
          <div className="mt-2 space-y-2">
            {q.conditions ? <p className="leading-relaxed whitespace-pre-line text-ink">{q.conditions}</p> : null}
            {q.internalNotes ? (
              <p className="rounded-lg bg-ink/[0.04] px-2.5 py-1.5 leading-relaxed text-slate">
                <span className="font-medium text-ink">Team only: </span>
                {q.internalNotes}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-slate">{label}</dt>
      <dd className="truncate font-mono text-ink tabular-nums">{value}</dd>
    </div>
  );
}


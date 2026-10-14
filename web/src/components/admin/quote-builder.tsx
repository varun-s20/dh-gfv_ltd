"use client";

import { clsx } from "clsx";
import { Info, Mail, MessageCircle, Send, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { saveOffer } from "@/app/admin/(console)/leads/[id]/actions";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/format";
import type { OfferPreviewTemplate } from "@/lib/admin/preview";
import { describe, FieldShell, FormMessage, SubmitButton, useFormAction } from "./forms";
import { btn, inputClass, textareaClass } from "./styles";

type Draft = { id: string; version: number; amountPence: number; conditions: string | null; internalNotes: string | null; validDays: number };
type Live = { version: number; amountPence: number; status: string; sentAt: string | null };

function fill(template: string, values: { amount: string; validUntil: string; conditions: string }) {
  return template.split("{{amount}}").join(values.amount).split("{{validUntil}}").join(values.validUntil).split("{{conditions}}").join(values.conditions);
}

/**
 * Offer builder with a live preview of exactly what the seller will receive.
 * The preview text comes from the real email/WhatsApp templates rendered on the
 * server with placeholders (see lib/admin/preview.ts), so it can't drift.
 */
export function QuoteBuilder({
  leadId,
  template,
  defaults,
  draft,
  live,
  prefers,
  whatsappReady,
  validDates,
  sellerFirstName,
  sellerEmail,
  sellerPhone,
}: {
  leadId: string;
  template: OfferPreviewTemplate;
  defaults: { conditions: string; validDays: number };
  draft: Draft | null;
  live: Live | null;
  prefers: string;
  whatsappReady: boolean;
  /** ukDate() strings for 1–30 days from now, rendered on the server so the preview matches the real message exactly. */
  validDates: string[];
  sellerFirstName: string;
  sellerEmail: string;
  sellerPhone: string;
}) {
  const id = useId();
  const [amount, setAmount] = useState(draft ? penceToPounds(draft.amountPence) : "");
  const [conditions, setConditions] = useState(draft?.conditions ?? defaults.conditions);
  const [internalNotes, setInternalNotes] = useState(draft?.internalNotes ?? "");
  const [days, setDays] = useState(String(draft?.validDays ?? defaults.validDays));
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(prefers === "whatsapp");
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<"email" | "whatsapp">(prefers === "whatsapp" ? "whatsapp" : "email");

  const { state, pending, formProps, error } = useFormAction(saveOffer, { onSuccess: () => setConfirming(false) });

  const pence = poundsToPence(amount);
  const validDays = Math.min(30, Math.max(1, Number.parseInt(days, 10) || defaults.validDays));
  const preview = useMemo(() => {
    const values = {
      amount: pence ? money(pence) : "£—",
      validUntil: validDates[validDays - 1] ?? "",
      conditions: conditions.trim() ? `\n\nConditions: ${conditions.trim()}` : "",
    };
    return { subject: fill(template.subject, values), email: fill(template.emailText, values), whatsapp: fill(template.whatsapp, values) };
  }, [pence, validDays, conditions, template, validDates]);

  const channels = [email && "email", whatsapp && "WhatsApp"].filter(Boolean) as string[];
  const canSend = Boolean(pence) && channels.length > 0;

  return (
    <form {...formProps} className="space-y-5" aria-describedby={`${id}-intro`}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="draftId" value={draft?.id ?? ""} />
      <p id={`${id}-intro`} className="sr-only">
        Build the offer, check the preview, then save a draft or send it.
      </p>

      {live ? (
        <p className="flex gap-2.5 rounded-xl bg-[#f3e6cf]/70 px-3.5 py-3 text-[0.85rem] leading-snug text-brass-deep">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Version {live.version} for <strong className="font-mono font-semibold">{money(live.amountPence)}</strong> is with the seller ({live.status}). Sending a new offer replaces it; saving a draft
            doesn&apos;t.
          </span>
        </p>
      ) : null}
      {draft ? (
        <p className="text-[0.82rem] text-slate">
          Editing draft <span className="font-mono">v{draft.version}</span>.
        </p>
      ) : null}

      <FieldShell id={`${id}-amount`} label="Offer" error={error("amount")}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xl text-slate">£</span>
          <input
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="18,500"
            className={inputClass("h-14 pl-9 font-mono text-[1.6rem] tracking-[-0.02em] tabular-nums placeholder:text-slate/25")}
            {...describe(`${id}-amount`, { error: error("amount") })}
          />
        </div>
      </FieldShell>

      <FieldShell
        id={`${id}-conditions`}
        label="Conditions"
        hint="Printed on the offer. Keep it short and plain."
        error={error("conditions")}
        aside={<span className="font-mono text-[0.7rem] text-slate tabular-nums">{conditions.length}/2000</span>}
      >
        <textarea
          name="conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          rows={3}
          maxLength={2000}
          className={textareaClass("min-h-20 text-[0.9rem]")}
          {...describe(`${id}-conditions`, { error: error("conditions"), hint: true })}
        />
      </FieldShell>

      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
        <FieldShell id={`${id}-notes`} label="Internal notes" optional error={error("internalNotes")}>
          <input
            name="internalNotes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            maxLength={2000}
            placeholder="Team only, never sent"
            className={inputClass("text-[0.9rem]")}
            {...describe(`${id}-notes`, { error: error("internalNotes") })}
          />
        </FieldShell>
        <FieldShell id={`${id}-days`} label="Valid for" error={error("validDays")}>
          <div className="relative">
            <input
              name="validDays"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              className={inputClass("pr-12 font-mono tabular-nums")}
              {...describe(`${id}-days`, { error: error("validDays") })}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate">days</span>
          </div>
        </FieldShell>
      </div>

      {/* Live preview */}
      <section aria-label="Preview" className="overflow-hidden rounded-xl border border-ink/[0.09] bg-white">
        <div role="tablist" aria-label="Preview channel" className="flex border-b border-ink/[0.07] bg-ivory/50 text-[0.8rem]">
          {(["email", "whatsapp"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={`${id}-preview-${t}`}
              id={`${id}-tab-${t}`}
              onClick={() => setTab(t)}
              className={clsx(
                "flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors",
                tab === t ? "bg-white font-medium text-ink shadow-[inset_0_-2px_0_var(--color-racing)]" : "text-slate hover:text-ink",
              )}
            >
              {t === "email" ? <Mail aria-hidden className="size-3.5" /> : <MessageCircle aria-hidden className="size-3.5" />}
              {t === "email" ? "Email" : "WhatsApp"}
            </button>
          ))}
        </div>
        {tab === "email" ? (
          <div role="tabpanel" id={`${id}-preview-email`} aria-labelledby={`${id}-tab-email`} className="space-y-2 p-4">
            <p className="text-xs text-slate">
              To <span className="font-mono">{sellerEmail}</span>
            </p>
            <p className="text-[0.92rem] font-semibold text-ink">{preview.subject}</p>
            <p className="text-[0.85rem] leading-relaxed whitespace-pre-line text-slate">{preview.email}</p>
          </div>
        ) : (
          <div role="tabpanel" id={`${id}-preview-whatsapp`} aria-labelledby={`${id}-tab-whatsapp`} className="bg-[#efe9dc] p-4">
            <p className="mb-2 text-xs text-slate">
              To <span className="font-mono">{sellerPhone}</span> · template <span className="font-mono">{template.whatsappTemplate}</span>
            </p>
            <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-[#d9f2d0] px-3.5 py-2.5 text-[0.86rem] leading-relaxed text-ink shadow-[0_1px_0_rgb(13_19_17/0.08)]">
              {preview.whatsapp}
            </div>
          </div>
        )}
      </section>

      {/* Channels */}
      <fieldset className="min-w-0 space-y-2" aria-describedby={error("channels") ? `${id}-channels-error` : undefined}>
        <legend className="text-sm font-medium text-ink">Send by</legend>
        <div className="grid grid-cols-2 gap-2">
          <ChannelBox name="channels" value="email" checked={email} onChange={setEmail} icon={<Mail aria-hidden />} label="Email" preferred={prefers === "email"} />
          <ChannelBox name="channels" value="whatsapp" checked={whatsapp} onChange={setWhatsapp} icon={<MessageCircle aria-hidden />} label="WhatsApp" preferred={prefers === "whatsapp"} />
        </div>
        {whatsapp && !whatsappReady ? (
          <p className="flex gap-2 text-[0.8rem] leading-snug text-amber">
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            WhatsApp isn&apos;t connected yet, so this message will be simulated: logged on the timeline but not delivered.
          </p>
        ) : null}
        {prefers === "phone" ? <p className="text-[0.8rem] text-slate">{sellerFirstName} prefers a phone call. Ring them, then send the offer in writing.</p> : null}
        {error("channels") ? (
          <p id={`${id}-channels-error`} className="text-[0.82rem] font-medium text-signal">
            {error("channels")}
          </p>
        ) : null}
      </fieldset>

      <FormMessage state={state} />

      {confirming ? (
        <div className="space-y-3 rounded-xl bg-field p-4 text-ivory" role="group" aria-label="Confirm sending">
          <p className="text-[0.92rem] leading-snug">
            Send <strong className="font-mono font-semibold text-plate">{pence ? money(pence) : ""}</strong> to {sellerFirstName} by {channels.join(" and ")}? It stays valid for {validDays}{" "}
            {validDays === 1 ? "day" : "days"}.
          </p>
          <div className="flex gap-2">
            <SubmitButton pending={pending} pendingLabel="Sending…" variant="plate" size="md" name="intent" value="send" className="flex-1" autoFocus>
              <Send aria-hidden />
              Send now
            </SubmitButton>
            <button type="button" onClick={() => setConfirming(false)} className={btn("dark-ghost", "md")} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <SubmitButton pending={pending} pendingLabel="Saving…" variant="secondary" name="intent" value="draft" disabled={!pence} className="sm:flex-1">
            Save draft
          </SubmitButton>
          <button type="button" onClick={() => setConfirming(true)} disabled={!canSend || pending} className={btn("plate", "md", "sm:flex-[1.4]")}>
            <Send aria-hidden />
            Send offer
          </button>
        </div>
      )}
    </form>
  );
}

function ChannelBox({
  name,
  value,
  checked,
  onChange,
  icon,
  label,
  preferred,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  preferred: boolean;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-racing/15 [&_svg]:size-4",
        checked ? "border-racing bg-racing/[0.05] text-ink" : "border-ink/12 bg-white text-slate hover:border-ink/30",
      )}
    >
      <input type="checkbox" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 shrink-0 accent-[var(--color-racing)]" />
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block">{label}</span>
        {preferred ? <span className="block text-[0.68rem] font-medium text-brass-deep">Seller&apos;s choice</span> : null}
      </span>
    </label>
  );
}

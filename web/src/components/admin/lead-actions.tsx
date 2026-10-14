"use client";

import { clsx } from "clsx";
import { Check, LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { addLeadNote, recordPurchase, setLeadStatus } from "@/app/admin/(console)/leads/[id]/actions";
import { penceToPounds } from "@/lib/admin/format";
import { LEAD_STATUSES, leadStatusMeta, type LeadStatusValue } from "@/lib/admin/status";
import { describe, FieldShell, FormMessage, SubmitButton, useFormAction } from "./forms";
import { btn, inputClass, selectClass, textareaClass } from "./styles";

/** Status picker that saves as soon as it changes. */
export function StatusControl({ leadId, status }: { leadId: string; status: LeadStatusValue }) {
  const { pending, formProps, state } = useFormAction(setLeadStatus, { toastError: true });
  const form = formProps.ref;
  return (
    <form {...formProps} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="lead-status" className="sr-only">
        Lead status
      </label>
      <div className="relative">
        <span aria-hidden className={clsx("pointer-events-none absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full", leadStatusMeta[status].dot)} />
        <select
          id="lead-status"
          name="status"
          defaultValue={status}
          key={status}
          disabled={pending}
          onChange={() => form.current?.requestSubmit()}
          className={selectClass("h-10 w-44 pl-7 font-medium")}
          aria-describedby="lead-status-hint"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {leadStatusMeta[s].label}
            </option>
          ))}
        </select>
      </div>
      <span id="lead-status-hint" className="sr-only">
        Changes save straight away.
      </span>
      {pending ? <LoaderCircle aria-label="Saving" className="size-4 animate-spin text-slate motion-reduce:animate-none" /> : null}
      {state && !state.ok ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}

/** One-tap "I've replied" for brand-new leads. */
export function MarkContacted({ leadId }: { leadId: string }) {
  const { pending, formProps } = useFormAction(setLeadStatus, { toastError: true });
  return (
    <form {...formProps}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value="contacted" />
      <SubmitButton pending={pending} variant="primary" size="md" pendingLabel="Saving…">
        <Check aria-hidden />
        Mark as contacted
      </SubmitButton>
    </form>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const { state, pending, formProps, error } = useFormAction(addLeadNote, { resetOnSuccess: true });
  const textarea = useRef<HTMLTextAreaElement>(null);
  return (
    <form {...formProps} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="note-body" className="sr-only">
        Add a note
      </label>
      <textarea
        ref={textarea}
        name="body"
        rows={2}
        maxLength={2000}
        required
        placeholder="Add a note for the team: calls, promises, anything the next person should know"
        className={textareaClass("min-h-20 resize-y")}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        {...describe("note-body", { error: error("body") })}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate">Only the team sees notes. Ctrl + Enter to save.</p>
        <SubmitButton pending={pending} size="sm" pendingLabel="Saving…">
          Add note
        </SubmitButton>
      </div>
      {state && !state.ok && !state.errors ? <FormMessage state={state} /> : null}
      {error("body") ? <p className="text-[0.82rem] font-medium text-signal">{error("body")}</p> : null}
    </form>
  );
}

export function PurchaseForm({ leadId, suggestedPence, recordedPence }: { leadId: string; suggestedPence: number | null; recordedPence: number | null }) {
  const { state, pending, formProps, error } = useFormAction(recordPurchase);
  const initial = recordedPence ?? suggestedPence;
  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <FieldShell id="purchase-price" label="Price paid" error={error("price")} hint={suggestedPence && !recordedPence ? "Prefilled with the accepted offer." : undefined}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-slate">£</span>
          <input
            name="price"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={initial ? penceToPounds(initial) : ""}
            className={inputClass("pl-7 font-mono text-base tabular-nums")}
            {...describe("purchase-price", { error: error("price"), hint: Boolean(suggestedPence && !recordedPence) })}
          />
        </div>
      </FieldShell>
      <FieldShell id="purchase-note" label="Note" optional error={error("note")}>
        <input name="note" maxLength={500} placeholder="e.g. £250 off for a cracked windscreen" className={inputClass()} {...describe("purchase-note", { error: error("note") })} />
      </FieldShell>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Saving…" className="w-full">
        {recordedPence ? "Update purchase" : "Record purchase and close"}
      </SubmitButton>
    </form>
  );
}

export function ContactLink({ href, label, icon, primary, external }: { href: string; label: string; icon: React.ReactNode; primary?: boolean; external?: boolean }) {
  return (
    <a href={href} className={btn(primary ? "primary" : "secondary", "md", "flex-1 sm:flex-none")} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {icon}
      {label}
      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
    </a>
  );
}

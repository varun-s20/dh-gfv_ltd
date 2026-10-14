"use client";

import { clsx } from "clsx";
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  addAdmin,
  cancelTotpSetup,
  changePassword,
  confirmTotpSetup,
  disableTotp,
  resetAdminPassword,
  saveAdsSettings,
  saveNotificationEmails,
  saveQuoteDefaults,
  setAdminDisabled,
  setAdminRole,
  signOutOtherDevices,
  startTotpSetup,
  type TempPasswordData,
} from "@/app/admin/(console)/settings/actions";
import type { ActionState } from "@/lib/admin/action-state";
import { CopyButton } from "./copy-button";
import { describe, FieldShell, FormMessage, SubmitButton, useFormAction } from "./forms";
import { btn, inputClass, selectClass, textareaClass } from "./styles";

/* ---------------------------------------------------------------- business settings */

export function NotificationsForm({ emails, canEdit, envFallback }: { emails: string[]; canEdit: boolean; envFallback: string[] }) {
  const { state, pending, formProps, error } = useFormAction(saveNotificationEmails);
  return (
    <form {...formProps} className="space-y-4">
      <FieldShell
        id="s-emails"
        label="Send new-lead and offer-response alerts to"
        hint={
          envFallback.length
            ? `One address per line. The server also always alerts: ${envFallback.join(", ")}.`
            : "One address per line. Every new lead and every accepted or declined offer emails these people."
        }
        error={error("emails")}
      >
        <textarea
          name="emails"
          defaultValue={emails.join("\n")}
          rows={4}
          disabled={!canEdit}
          spellCheck={false}
          placeholder="danny@greenfuturevehicles.com"
          className={textareaClass("font-mono text-[0.88rem]")}
          {...describe("s-emails", { hint: true, error: error("emails") })}
        />
      </FieldShell>
      <FormMessage state={state} />
      {canEdit ? (
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save recipients
        </SubmitButton>
      ) : (
        <OwnerOnly />
      )}
    </form>
  );
}

export function QuoteDefaultsForm({ conditions, validDays, canEdit }: { conditions: string; validDays: number; canEdit: boolean }) {
  const { state, pending, formProps, error } = useFormAction(saveQuoteDefaults);
  const [text, setText] = useState(conditions);
  return (
    <form {...formProps} className="space-y-4">
      <FieldShell
        id="s-conditions"
        label="Standard conditions"
        hint="Prefilled on every new offer and printed for the seller. Edit per offer if needed."
        error={error("conditions")}
        aside={<span className="font-mono text-[0.7rem] text-slate tabular-nums">{text.length}/2000</span>}
      >
        <textarea
          name="conditions"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          disabled={!canEdit}
          className={textareaClass("text-[0.92rem]")}
          {...describe("s-conditions", { hint: true, error: error("conditions") })}
        />
      </FieldShell>
      <FieldShell id="s-days" label="Offers stay valid for" error={error("validDays")} className="max-w-48">
        <div className="relative">
          <input
            name="validDays"
            type="number"
            min={1}
            max={30}
            defaultValue={validDays}
            disabled={!canEdit}
            className={inputClass("pr-14 font-mono tabular-nums")}
            {...describe("s-days", { error: error("validDays") })}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate">days</span>
        </div>
      </FieldShell>
      <FormMessage state={state} />
      {canEdit ? (
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save defaults
        </SubmitButton>
      ) : (
        <OwnerOnly />
      )}
    </form>
  );
}

export function AdsForm({ conversionName, canEdit }: { conversionName: string; canEdit: boolean }) {
  const { state, pending, formProps, error } = useFormAction(saveAdsSettings);
  return (
    <form {...formProps} className="space-y-4">
      <FieldShell
        id="s-conversion"
        label="Offline conversion name"
        hint="Must match the conversion action in Google Ads exactly (Goals › Conversions). Used in the conversions CSV."
        error={error("conversionName")}
      >
        <input
          name="conversionName"
          defaultValue={conversionName}
          maxLength={100}
          disabled={!canEdit}
          className={inputClass("max-w-md")}
          {...describe("s-conversion", { hint: true, error: error("conversionName") })}
        />
      </FieldShell>
      <FormMessage state={state} />
      {canEdit ? (
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save
        </SubmitButton>
      ) : (
        <OwnerOnly />
      )}
    </form>
  );
}

function OwnerOnly() {
  return <p className="text-sm text-slate">Only an owner can change this.</p>;
}

/* ---------------------------------------------------------------- my account */

export function PasswordForm({ email }: { email: string }) {
  const { state, pending, formProps, error } = useFormAction(changePassword, { resetOnSuccess: true });
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";
  return (
    <form {...formProps} className="space-y-4">
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" name="username" autoComplete="username" hidden readOnly value={email} />
      <FieldShell id="pw-current" label="Current password" error={error("current")} className="max-w-md">
        <input name="current" type={type} autoComplete="current-password" required className={inputClass()} {...describe("pw-current", { error: error("current") })} />
      </FieldShell>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <FieldShell id="pw-next" label="New password" hint="At least 12 characters. A short phrase works well." error={error("next")}>
          <input name="next" type={type} autoComplete="new-password" required minLength={12} className={inputClass()} {...describe("pw-next", { hint: true, error: error("next") })} />
        </FieldShell>
        <FieldShell id="pw-confirm" label="New password again" error={error("confirm")}>
          <input name="confirm" type={type} autoComplete="new-password" required minLength={12} className={inputClass()} {...describe("pw-confirm", { error: error("confirm") })} />
        </FieldShell>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} pendingLabel="Changing…">
          <KeyRound aria-hidden />
          Change password
        </SubmitButton>
        <button type="button" className={btn("ghost", "sm")} onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {show ? "Hide passwords" : "Show passwords"}
        </button>
      </div>
      <p className="text-xs text-slate">Changing your password signs you out on every other device.</p>
    </form>
  );
}

export function TotpStart() {
  const { pending, formProps, state } = useFormAction(startTotpSetup, { toastSuccess: false });
  return (
    <form {...formProps} className="space-y-3">
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingLabel="Preparing…">
        <ShieldCheck aria-hidden />
        Set up two-step verification
      </SubmitButton>
    </form>
  );
}

export function TotpConfirm({ qr, secret, account }: { qr: string; secret: string; account: string }) {
  const confirm = useFormAction(confirmTotpSetup);
  const cancel = useFormAction(cancelTotpSetup, { toastSuccess: false });
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="rounded-2xl border border-ink/10 bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        <img src={qr} alt="QR code for your authenticator app" width={200} height={200} className="mx-auto size-[12rem]" />
      </div>
      <div className="space-y-4">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
          <li>Open Google Authenticator, Microsoft Authenticator, 1Password or similar.</li>
          <li>Scan the code, or type the key below.</li>
          <li>Enter the 6-digit code it shows to switch two-step verification on.</li>
        </ol>
        <div className="rounded-xl bg-ink/[0.04] px-3.5 py-2.5">
          <p className="text-xs text-slate">Set-up key for {account}</p>
          <p className="mt-1 flex items-center gap-1 font-mono text-[0.92rem] tracking-wider break-all text-ink">
            {grouped}
            <CopyButton value={secret} label="Copy set-up key" />
          </p>
        </div>
        <form {...confirm.formProps} className="flex flex-wrap items-start gap-2">
          <div className="w-40">
            <label htmlFor="totp-code" className="sr-only">
              6-digit code
            </label>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123 456"
              maxLength={7}
              required
              className={inputClass("text-center font-mono text-lg tracking-[0.25em]")}
              {...describe("totp-code", { error: confirm.error("code") })}
            />
          </div>
          <SubmitButton pending={confirm.pending} pendingLabel="Checking…">
            Turn on
          </SubmitButton>
        </form>
        {confirm.error("code") ? (
          <p id="totp-code-error" className="text-[0.82rem] font-medium text-signal">
            {confirm.error("code")}
          </p>
        ) : (
          <FormMessage state={confirm.state} />
        )}
        <form {...cancel.formProps}>
          <SubmitButton pending={cancel.pending} variant="ghost" size="sm" className="-ml-3 text-slate">
            Cancel set-up
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function TotpDisable() {
  const [open, setOpen] = useState(false);
  const { state, pending, formProps, error } = useFormAction(disableTotp, { onSuccess: () => setOpen(false) });
  if (!open) {
    return (
      <button type="button" className={btn("secondary", "md")} onClick={() => setOpen(true)}>
        <ShieldOff aria-hidden />
        Turn off
      </button>
    );
  }
  return (
    <form {...formProps} className="max-w-md space-y-3 rounded-xl border border-signal/20 bg-signal-soft/40 p-4">
      <FieldShell id="totp-off-pw" label="Confirm with your password" error={error("password")}>
        <input name="password" type="password" autoComplete="current-password" required autoFocus className={inputClass()} {...describe("totp-off-pw", { error: error("password") })} />
      </FieldShell>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pending={pending} variant="danger" pendingLabel="Turning off…">
          Turn off two-step verification
        </SubmitButton>
        <button type="button" className={btn("ghost", "md")} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SignOutOthers({ others }: { others: number }) {
  const { pending, formProps } = useFormAction(signOutOtherDevices);
  return (
    <form {...formProps} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate">
        {others ? (
          <>
            You&apos;re signed in on <span className="font-mono text-ink">{others}</span> other {others === 1 ? "device" : "devices"} as well as this one.
          </>
        ) : (
          "This is the only device signed in to your account."
        )}
      </p>
      <SubmitButton pending={pending} variant="secondary" pendingLabel="Signing out…" disabled={!others}>
        Sign out other devices
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------- team */

function TempPassword({ data, onDone }: { data: TempPasswordData; onDone: () => void }) {
  return (
    <div role="status" className="space-y-3 rounded-xl bg-field p-4 text-ivory">
      <p className="text-sm">
        Temporary password for <span className="font-mono">{data.email}</span>. It&apos;s shown once: share it in person or by phone, and ask them to change it under Settings › My account.
      </p>
      <p className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 font-mono text-lg tracking-wide text-plate">
        <span className="flex-1 select-all">{data.password}</span>
        <CopyButton value={data.password} label="Copy password" tone="dark" />
      </p>
      <button type="button" className={btn("dark-ghost", "sm", "-ml-2")} onClick={onDone}>
        Done, hide it
      </button>
    </div>
  );
}

export function AddAdminForm() {
  const [shown, setShown] = useState<TempPasswordData | null>(null);
  const { state, pending, formProps, error } = useFormAction(addAdmin, { resetOnSuccess: true, onSuccess: (s) => s.data && setShown(s.data) });
  return (
    <div className="space-y-4">
      {shown ? <TempPassword data={shown} onDone={() => setShown(null)} /> : null}
      <form {...formProps} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_9rem_auto] sm:items-end">
        <FieldShell id="t-name" label="Name" error={error("name")}>
          <input name="name" required autoComplete="off" className={inputClass()} {...describe("t-name", { error: error("name") })} />
        </FieldShell>
        <FieldShell id="t-email" label="Email" error={error("email")}>
          <input name="email" type="email" required autoComplete="off" spellCheck={false} className={inputClass()} {...describe("t-email", { error: error("email") })} />
        </FieldShell>
        <FieldShell id="t-role" label="Role">
          <select id="t-role" name="role" defaultValue="staff" className={selectClass()}>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
        </FieldShell>
        <SubmitButton pending={pending} pendingLabel="Adding…">
          <UserPlus aria-hidden />
          Add
        </SubmitButton>
        <div className="sm:col-span-4">
          <FormMessage state={state && !state.errors ? state : null} />
          <p className="text-xs text-slate">Staff can work leads, send offers and edit content. Owners can also change business settings and manage the team.</p>
        </div>
      </form>
    </div>
  );
}

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  disabled: boolean;
  totpEnabled: boolean;
  lastLogin: string | null;
  sessions: number;
};

export function TeamMemberRow({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const role = useFormAction(setAdminRole, { toastError: true });
  const toggle = useFormAction(setAdminDisabled, { toastError: true });
  const [resetOpen, setResetOpen] = useState(false);
  const [shown, setShown] = useState<TempPasswordData | null>(null);
  const reset = useFormAction(resetAdminPassword, { toastError: true, onSuccess: (s: ActionState<TempPasswordData>) => s.data && (setShown(s.data), setResetOpen(false)) });

  return (
    <li className={clsx("space-y-3 px-5 py-4", member.disabled && "bg-ink/[0.02]")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className={clsx("font-medium", member.disabled ? "text-slate line-through decoration-slate/40" : "text-ink")}>
            {member.name}
            {isSelf ? <span className="ml-2 text-xs font-normal text-slate">(you)</span> : null}
          </p>
          <p className="truncate font-mono text-[0.8rem] text-slate">{member.email}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate">
            <span>{member.lastLogin ? `Last signed in ${member.lastLogin}` : "Never signed in"}</span>
            <span className={member.totpEnabled ? "text-ok" : undefined}>{member.totpEnabled ? "Two-step on" : "Two-step off"}</span>
            {member.disabled ? <span className="font-medium text-signal">Disabled</span> : null}
          </p>
        </div>
        <form {...role.formProps} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={member.id} />
          <label htmlFor={`role-${member.id}`} className="sr-only">
            Role for {member.name}
          </label>
          <select
            id={`role-${member.id}`}
            name="role"
            key={member.role}
            defaultValue={member.role}
            disabled={role.pending || member.disabled}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className={selectClass("h-9 w-28 text-sm")}
          >
            <option value="owner">Owner</option>
            <option value="staff">Staff</option>
          </select>
        </form>
        {!isSelf ? (
          <div className="flex gap-2">
            <button type="button" className={btn("secondary", "sm")} onClick={() => setResetOpen((v) => !v)} aria-expanded={resetOpen}>
              Reset password
            </button>
            <form {...toggle.formProps}>
              <input type="hidden" name="userId" value={member.id} />
              <input type="hidden" name="disabled" value={member.disabled ? "false" : "true"} />
              <SubmitButton pending={toggle.pending} variant={member.disabled ? "secondary" : "danger"} size="sm">
                {member.disabled ? "Enable" : "Disable"}
              </SubmitButton>
            </form>
          </div>
        ) : null}
      </div>
      {resetOpen ? (
        <form {...reset.formProps} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink/[0.04] px-4 py-3">
          <input type="hidden" name="userId" value={member.id} />
          <p className="flex-1 basis-64 text-sm text-slate">
            {member.name} will be signed out everywhere and given a new temporary password.
          </p>
          {member.totpEnabled ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="resetTotp" className="size-4 accent-[var(--color-racing)]" />
              Also turn off two-step (lost phone)
            </label>
          ) : null}
          <SubmitButton pending={reset.pending} size="sm" pendingLabel="Resetting…">
            Create new password
          </SubmitButton>
        </form>
      ) : null}
      {shown ? <TempPassword data={shown} onDone={() => setShown(null)} /> : null}
    </li>
  );
}

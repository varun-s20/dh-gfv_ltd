"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { signIn, verifySignInCode } from "@/app/admin/(auth)/actions";
import { FormMessage, SubmitButton, useFormAction } from "./forms";
import { inputClass, labelClass } from "./styles";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const { state, pending, formProps } = useFormAction(signIn, { toastSuccess: false });
  const [show, setShow] = useState(false);
  return (
    <form {...formProps} className="space-y-5" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      {notice ? <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">{notice}</p> : null}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          className={inputClass("mt-1.5 h-12 text-base")}
          aria-invalid={state && !state.ok ? true : undefined}
          aria-describedby={state && !state.ok ? "login-error" : undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={inputClass("h-12 pr-12 text-base")}
            aria-invalid={state && !state.ok ? true : undefined}
            aria-describedby={state && !state.ok ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-md text-slate hover:text-ink"
            aria-pressed={show}
          >
            {show ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            <span className="sr-only">{show ? "Hide password" : "Show password"}</span>
          </button>
        </div>
      </div>
      <div id="login-error">
        <FormMessage state={state} />
      </div>
      <SubmitButton pending={pending} pendingLabel="Signing in…" size="lg" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function VerifyForm({ next }: { next: string }) {
  const { state, pending, formProps } = useFormAction(verifySignInCode, { toastSuccess: false });
  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="code" className={labelClass}>
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          placeholder="123 456"
          className={inputClass("mt-1.5 h-14 text-center font-mono text-[1.6rem] tracking-[0.35em] placeholder:tracking-[0.35em]")}
          aria-invalid={state && !state.ok ? true : undefined}
          aria-describedby={state && !state.ok ? "verify-error" : undefined}
        />
      </div>
      <div id="verify-error">
        <FormMessage state={state} />
      </div>
      <SubmitButton pending={pending} pendingLabel="Checking…" size="lg" className="w-full">
        Verify and continue
      </SubmitButton>
    </form>
  );
}

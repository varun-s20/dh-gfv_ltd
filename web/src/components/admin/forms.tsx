"use client";

import { clsx } from "clsx";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { startTransition, useActionState, useCallback, useEffect, useRef, type ComponentProps, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/action-state";
import { btn, hintClass, labelClass } from "./styles";
import { toast } from "./toast";

type Action<T> = (prev: ActionState<T> | null, formData: FormData) => Promise<ActionState<T>>;

/**
 * useActionState wrapper for admin forms.
 * - Submits through onSubmit so React doesn't reset the fields when the
 *   server rejects the input (React 19 resets uncontrolled forms after an action).
 * - Toasts as soon as the action resolves, so the confirmation still appears
 *   when the refreshed page unmounts or re-keys the form that sent it.
 * - Optional reset / callback on success.
 */
export function useFormAction<T = undefined>(
  action: Action<T>,
  opts: { resetOnSuccess?: boolean; toastSuccess?: boolean; toastError?: boolean; onSuccess?: (state: ActionState<T>) => void } = {},
) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const run = useCallback(
    async (prev: ActionState<T> | null, formData: FormData) => {
      const result = await action(prev, formData);
      const o = optsRef.current;
      // Actions that redirect (sign-in) may not hand back a result.
      if (result?.ok && result.message && o.toastSuccess !== false) toast(result.message);
      if (result && !result.ok && result.message && o.toastError) toast(result.message, "error");
      return result;
    },
    [action],
  );
  const [state, dispatch, pending] = useActionState<ActionState<T> | null, FormData>(run, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<number | null>(null);

  useEffect(() => {
    if (!state || handled.current === state.at) return;
    handled.current = state.at;
    if (!state.ok) return;
    if (optsRef.current.resetOnSuccess) formRef.current?.reset();
    optsRef.current.onSuccess?.(state);
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter instanceof HTMLElement ? submitter : undefined);
    startTransition(() => dispatch(data));
  };

  return { state, pending, formProps: { ref: formRef, onSubmit }, error: (field: string) => state?.errors?.[field] };
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Omit<ComponentProps<"button">, "type"> & {
  pending: boolean;
  pendingLabel?: string;
  variant?: Parameters<typeof btn>[0];
  size?: Parameters<typeof btn>[1];
}) {
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-disabled={pending || undefined} className={btn(variant, size, className)} {...rest}>
      {pending ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Form-level outcome line, announced to screen readers. */
export function FormMessage({ state, className }: { state: ActionState<unknown> | null; className?: string }) {
  if (!state || state.ok || !state.message) return <p aria-live="polite" className="sr-only" />;
  return (
    <p role="alert" className={clsx("flex items-start gap-2 rounded-lg bg-signal-soft px-3 py-2 text-sm font-medium text-signal", className)}>
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {state.message}
    </p>
  );
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
  aside,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
          {optional ? <span className="ml-2 font-mono text-[0.65rem] tracking-wider text-slate uppercase">Optional</span> : null}
        </label>
        {aside}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[0.82rem] font-medium text-signal">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for an input inside FieldShell. */
export const describe = (id: string, opts: { hint?: boolean; error?: string }) => ({
  id,
  "aria-invalid": opts.error ? true : undefined,
  "aria-describedby": [opts.error ? `${id}-error` : null, opts.hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined,
});

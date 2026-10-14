import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type ErrorLike = { message?: string } | undefined;

const control =
  "block w-full rounded-2xl bg-pearl-50 text-[1rem] text-carbon ring-1 ring-carbon/15 transition-[box-shadow] duration-200 placeholder:text-carbon-3/60 hover:ring-carbon/30 focus:ring-2 focus:ring-ion-deep focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-alert-deep";

/** Label, hint and error wiring around a single control. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: ErrorLike;
  optional?: boolean;
  className?: string;
  children: (a11y: { describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errId = error?.message ? `${htmlFor}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className} data-field={htmlFor}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[0.95rem] font-semibold tracking-[-0.01em]">{label}</span>
        {optional ? <span className="text-[0.78rem] text-carbon-3">Optional</span> : null}
      </label>
      <div className="mt-2">{children({ describedBy, invalid: Boolean(error?.message) })}</div>
      {error?.message ? (
        <p id={errId} className="mt-2 flex items-start gap-1.5 text-[0.85rem] text-alert-deep">
          <span aria-hidden className="mt-[0.35rem] size-1.5 flex-none rounded-full bg-alert-deep" />
          {error.message}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-[0.82rem] leading-relaxed text-carbon-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, suffix, className, ...props }: ComponentProps<"input"> & { invalid?: boolean; suffix?: string }) {
  return (
    <div className="relative">
      <input aria-invalid={invalid || undefined} className={clsx(control, "h-14 px-4", suffix && "pr-10", className)} {...props} />
      {suffix ? <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-carbon-3">{suffix}</span> : null}
    </div>
  );
}

export function SelectInput({ invalid, className, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select aria-invalid={invalid || undefined} className={clsx(control, "h-14 cursor-pointer appearance-none pr-11 pl-4", className)} {...props}>
        {children}
      </select>
      <svg viewBox="0 0 5 10" aria-hidden className="pointer-events-none absolute top-1/2 right-4 h-2.5 w-1.5 -translate-y-1/2 rotate-90 text-carbon-3" fill="none">
        <path d="M1 1.2 3.55 4a1.5 1.5 0 0 1 0 2L1 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function TextArea({ invalid, className, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={clsx(control, "min-h-28 px-4 py-3.5 leading-relaxed", className)} {...props} />;
}

export type Choice = { value: string; label: string; hint?: string };

/**
 * Radio or checkbox cards. The native input stays in the DOM (visually hidden)
 * so keyboard, screen readers and validation focus all behave as normal.
 */
export function ChoiceGroup({
  legend,
  name,
  options,
  registration,
  error,
  hint,
  type = "radio",
  columns = 2,
  className,
}: {
  legend: string;
  name: string;
  options: Choice[];
  registration: UseFormRegisterReturn;
  error?: ErrorLike;
  hint?: string;
  type?: "radio" | "checkbox";
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const errId = error?.message ? `${name}-err` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <fieldset className={className} data-field={name} aria-describedby={[errId, hintId].filter(Boolean).join(" ") || undefined}>
      <legend className="font-display text-[0.95rem] font-semibold tracking-[-0.01em]">{legend}</legend>
      {hint ? (
        <p id={hintId} className="mt-1 text-[0.82rem] leading-relaxed text-carbon-3">
          {hint}
        </p>
      ) : null}
      {/* Columns follow the room this group actually has (it may share a row with another), not the screen. */}
      <div className="@container mt-3">
        <div className={clsx("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-2 @sm:grid-cols-3", columns === 4 && "grid-cols-2 @lg:grid-cols-4")}>
          {options.map((o) => (
            <label key={o.value} className="relative cursor-pointer">
              <input type={type} value={o.value} className="peer sr-only" aria-invalid={error?.message ? true : undefined} {...registration} />
              <span
                className={clsx(
                  "flex h-full min-h-14 flex-col justify-center rounded-2xl bg-pearl-50 px-4 py-3 ring-1 ring-carbon/15 transition-[box-shadow,background-color,color] duration-200",
                  "hover:ring-carbon/35 peer-checked:bg-carbon peer-checked:text-pearl-50 peer-checked:ring-carbon peer-focus-visible:ring-2 peer-focus-visible:ring-ion-deep peer-checked:[&_[data-dot]]:border-ion peer-checked:[&_[data-dot]]:bg-ion",
                  error?.message && "ring-alert-deep/60",
                )}
              >
                <span className="flex items-center justify-between gap-3 text-[0.95rem] font-medium">
                  {o.label}
                  <span
                    aria-hidden
                    data-dot
                    className={clsx(
                      "flex size-4 flex-none items-center justify-center border border-current/30 transition-colors",
                      type === "radio" ? "rounded-full" : "rounded-[0.3rem]",
                    )}
                  />
                </span>
                {o.hint ? <span className="mt-0.5 block text-[0.78rem] leading-snug opacity-65">{o.hint}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </div>
      {error?.message ? (
        <p id={errId} className="mt-2 flex items-start gap-1.5 text-[0.85rem] text-alert-deep">
          <span aria-hidden className="mt-[0.35rem] size-1.5 flex-none rounded-full bg-alert-deep" />
          {error.message}
        </p>
      ) : null}
    </fieldset>
  );
}

"use client";

import { clsx } from "clsx";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { CtaButton } from "@/components/ui/primitives";
import { track } from "@/lib/analytics/client";
import { isPlausibleReg, normaliseReg, type Category } from "@/lib/vehicles";

/**
 * The fastest way in: type the registration on a UK front plate and carry it
 * into the quote form. Works without JavaScript as a plain GET form.
 */
export function RegEntry({
  category,
  location,
  label = "Get my offer",
  tone = "night",
  className,
}: {
  category?: Category;
  location: string;
  label?: string;
  tone?: "night" | "pearl";
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  // Uncontrolled on purpose: anything typed before the page hydrates is kept.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const reg = String(new FormData(e.currentTarget).get("reg") ?? "").trim();
    if (!reg) {
      setError("Enter your registration to get started.");
      return;
    }
    if (!isPlausibleReg(reg)) {
      setError("That doesn't look like a UK registration.");
      return;
    }
    const params = new URLSearchParams();
    params.set("reg", normaliseReg(reg));
    if (category) params.set("category", category);
    track("quote_start", { location, vehicle_category: category ?? "unknown" });
    router.push(`/quote${params.size ? `?${params}` : ""}` as Route);
  };

  return (
    <form action="/quote" method="get" onSubmit={submit} noValidate className={clsx("w-full", className)}>
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <label htmlFor={id} className={clsx("eyebrow mb-2.5 block", tone === "night" ? "text-chalk-2" : "text-carbon-3")}>
        Vehicle registration
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div
          className={clsx(
            "flex h-14 min-w-0 flex-1 items-stretch overflow-hidden rounded-2xl bg-[#f6f5f1] ring-1 transition-shadow duration-200 focus-within:ring-2",
            error ? "ring-alert focus-within:ring-alert" : tone === "night" ? "ring-black/40 focus-within:ring-ion" : "ring-carbon/25 focus-within:ring-ion-deep",
          )}
        >
          <span className="flex w-10 flex-none flex-col items-center justify-end bg-[#1f3d8f] pb-1.5 font-display text-[0.62rem] font-bold text-white" aria-hidden>
            UK
          </span>
          <input
            id={id}
            name="reg"
            maxLength={8}
            onInput={(e) => {
              const el = e.currentTarget;
              const next = el.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
              if (next !== el.value) el.value = next;
              if (error) setError(null);
            }}
            placeholder="AB12 CDE"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className="w-0 min-w-0 flex-1 bg-transparent px-4 font-display text-[1.65rem] font-bold tracking-[0.08em] text-black uppercase placeholder:text-black/25 focus:outline-none wd-62"
          />
        </div>
        <CtaButton type="submit" variant={tone === "night" ? "chalk" : "carbon"} size="lg" className="flex-none [&_.cta-inner]:h-14">
          {label}
        </CtaButton>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className={clsx("mt-2 text-sm", tone === "night" ? "text-alert" : "text-alert-deep")}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

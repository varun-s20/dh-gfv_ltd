import { clsx } from "clsx";
import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Chevron, Cta, Em } from "@/components/ui/primitives";
import { comparison, type Faq, type Feature } from "@/content/shared";
import { site, whatsappLink } from "@/lib/site";

/** Section heading pair used across pages. */
export function SectionHead({ label, heading, sub, className, tone = "night" }: { label?: string; heading: string; sub?: string; className?: string; tone?: "night" | "pearl" }) {
  return (
    <div className={clsx("max-w-3xl 2xl:max-w-4xl", className)}>
      {label ? <p className={clsx("eyebrow", tone === "night" ? "text-chalk-3" : "text-carbon-3")}>{label}</p> : null}
      <h2 className={clsx("display text-d2", label && "mt-4")}>
        <Em text={heading} />
      </h2>
      {sub ? <p className={clsx("mt-5 max-w-xl text-lead", tone === "night" ? "text-chalk-2" : "text-carbon-2")}>{sub}</p> : null}
    </div>
  );
}

/** Us against instant-offer sites, row by row. */
export function ComparisonTable({ className }: { className?: string }) {
  return (
    <div className={clsx("overflow-hidden rounded-[1.75rem] bg-pearl-50 shadow-[0_0_0_1px_rgb(13_15_18/0.06)]", className)}>
      {/* Phones: each row stacks the two answers full width, each with its own small heading. */}
      <div className="hidden border-b border-carbon/10 sm:grid sm:grid-cols-[0.8fr_1fr_1fr]">
        <div className="p-5" />
        <p className="label p-5 text-carbon-3">Typical instant-offer sites</p>
        <p className="label flex items-center gap-2 bg-carbon p-5 text-pearl-50">
          <span className="ion-dot" /> {site.brand.fullName}
        </p>
      </div>
      {comparison.map((row) => (
        <div key={row.label} className="grid border-b border-carbon/10 last:border-b-0 sm:grid-cols-[0.8fr_1fr_1fr]">
          <p className="px-5 pt-5 font-display text-[1.02rem] font-semibold tracking-[-0.01em] sm:py-6">{row.label}</p>
          <p className="px-5 pt-2 pb-3 text-[0.95rem] leading-relaxed text-carbon-3 sm:p-5 sm:py-6">
            <span className="label mb-1 block text-[0.68rem] text-carbon-3/80 sm:hidden">Instant-offer sites</span>
            {row.them}
          </p>
          <p className="flex gap-3 bg-carbon/[0.035] px-5 py-3.5 text-[0.95rem] leading-relaxed text-carbon sm:p-5 sm:py-6">
            <Check aria-hidden className="mt-0.5 size-4 flex-none text-ion-deep" strokeWidth={2.4} />
            <span>
              <span className="label mb-1 block text-[0.68rem] text-ion-deep sm:hidden">{site.brand.fullName}</span>
              {row.us}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

/** Accordion of questions on native <details>, with an animated open. */
export function FaqList({ faqs, tone = "pearl" }: { faqs: Faq[]; tone?: "night" | "pearl" }) {
  return (
    <div className={clsx("border-t", tone === "pearl" ? "border-carbon/12" : "hairline")}>
      {faqs.map((f) => (
        <details key={f.q} className={clsx("faq-item group border-b", tone === "pearl" ? "border-carbon/12" : "hairline")}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-[1.12rem] font-medium tracking-[-0.015em] sm:text-[1.25rem]">
            {f.q}
            <span
              className={clsx(
                "faq-plus flex size-8 flex-none items-center justify-center rounded-full",
                tone === "pearl" ? "bg-carbon/[0.06] text-carbon" : "bg-chalk/[0.08] text-chalk",
              )}
            >
              <Plus aria-hidden className="size-4" strokeWidth={1.8} />
            </span>
          </summary>
          <p className={clsx("max-w-3xl pb-7 text-[1rem] leading-relaxed", tone === "pearl" ? "text-carbon-2" : "text-chalk-2")}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqSection({ faqs, heading = "Questions, *answered.*", more = true, sheet }: { faqs: Faq[]; heading?: string; more?: boolean; sheet?: boolean }) {
  return (
    <section className={clsx("on-pearl py-24 sm:py-32", sheet && "sheet")} data-nav-theme="pearl">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHead heading={heading} tone="pearl" />
          <p className="mt-5 max-w-sm text-carbon-2">
            Something else?{" "}
            <a href={whatsappLink("Hi, I have a question about selling my vehicle.")} target="_blank" rel="noopener" className="text-carbon underline underline-offset-4">
              Ask us on WhatsApp
            </a>{" "}
            or call{" "}
            <a href={`tel:${site.contact.phoneE164}`} className="text-carbon tabular-nums">
              {site.contact.phoneDisplay}
            </a>
            .
          </p>
          {more ? (
            <Link href="/faq" className="label chev-link mt-8 text-carbon">
              All questions <Chevron />
            </Link>
          ) : null}
        </div>
        <FaqList faqs={faqs} />
      </div>
    </section>
  );
}

/** Numbered feature grid with hairline dividers, as on lucidmotors.com's spec rows. */
export function FeatureGrid({ items, tone = "night", columns = 2 }: { items: Feature[]; tone?: "night" | "pearl"; columns?: 2 | 3 | 4 }) {
  return (
    <ul
      className={clsx(
        "grid border-t",
        tone === "night" ? "hairline" : "border-carbon/12",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {items.map((it, i) => (
        <li key={it.title} className={clsx("border-b py-8 pr-8", tone === "night" ? "hairline" : "border-carbon/12")}>
          <span className={clsx("font-mono text-[0.75rem] tabular-nums", tone === "night" ? "text-ion" : "text-ion-deep")}>0{i + 1}</span>
          <h3 className="mt-4 font-display text-[1.3rem] font-medium tracking-[-0.02em]">{it.title}</h3>
          <p className={clsx("mt-2.5 max-w-md leading-relaxed", tone === "night" ? "text-chalk-2" : "text-carbon-2")}>{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** Closing band: a dark sheet with a giant word behind the headline and the registration entry. */
export function CtaBand({ heading, sub, children, word = "Offer" }: { heading: string; sub: string; children: React.ReactNode; word?: string }) {
  return (
    <section className="sheet relative overflow-hidden bg-night-950 pt-28 pb-28 sm:pt-36 sm:pb-36" data-nav-theme="night">
      <div className="absolute inset-0 bg-[radial-gradient(50%_70%_at_80%_100%,rgb(157_240_196/0.09),transparent_70%),radial-gradient(60%_60%_at_20%_0%,rgb(239_237_232/0.06),transparent_70%)]" />
      <p aria-hidden className="backdrop-word backdrop-word-fill pointer-events-none absolute inset-x-0 top-[6%] text-center text-[24vw] opacity-[0.22] lg:text-[19vw]">
        {word}
      </p>
      <div className="container-page relative grid gap-10 lg:grid-cols-[1fr_29rem] lg:items-end">
        <Reveal>
          <h2 className="display max-w-[16ch] text-d1">
            <Em text={heading} />
          </h2>
          <p className="mt-5 max-w-md text-lead text-chalk-2">{sub}</p>
        </Reveal>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function TalkStrip() {
  return (
    <div className="flex flex-wrap gap-2">
      <Cta href={whatsappLink("Hi, I'd like an offer for my vehicle.")} variant="ghost" target="_blank" rel="noopener">
        WhatsApp us
      </Cta>
      <Cta href={`tel:${site.contact.phoneE164}`} variant="ghost">
        Call {site.contact.phoneDisplay}
      </Cta>
    </div>
  );
}

"use client";

import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { resetLanding, saveLanding } from "@/app/admin/(console)/content/actions";
import { Em } from "@/components/ui/primitives";
import { CONTENT_LIMITS, type ContentField } from "@/lib/admin/content-limits";
import { describe, FieldShell, FormMessage, SubmitButton, useFormAction } from "./forms";
import { btn, inputClass, textareaClass } from "./styles";

export type ContentValues = Record<ContentField, string>;

const FIELDS: Array<{ name: ContentField; label: string; hint?: string; multiline?: boolean; group: "hero" | "cta" | "seo"; emphasis?: boolean }> = [
  { name: "heroEyebrow", label: "Eyebrow", hint: "The small line above the headline.", group: "hero" },
  { name: "heroHeadline", label: "Headline", group: "hero", emphasis: true },
  { name: "heroSub", label: "Intro", hint: "One or two sentences under the headline.", multiline: true, group: "hero" },
  { name: "heroCtaLabel", label: "Button label", hint: "Says what happens next, e.g. Get my offer.", group: "hero" },
  { name: "ctaHeading", label: "Heading", group: "cta", emphasis: true },
  { name: "ctaSub", label: "Line under the heading", multiline: true, group: "cta" },
  { name: "seoTitle", label: "Title", hint: "Shown as the blue link in Google. Aim for 50–60 characters.", group: "seo" },
  { name: "seoDescription", label: "Description", hint: "The grey text under the link in Google. Aim for 140–160 characters.", multiline: true, group: "seo" },
];

const GROUPS = { hero: "Hero (top of the page)", cta: "Closing call to action", seo: "Search engines" } as const;

/**
 * Landing page copy editor. Each field shows the default as its placeholder;
 * leave a field empty to keep the default.
 */
export function ContentEditor({ category, defaults, values, liveHref }: { category: string; defaults: ContentValues; values: ContentValues; liveHref: string }) {
  const [draft, setDraft] = useState<ContentValues>(values);
  const { state, pending, formProps, error } = useFormAction(saveLanding);
  const changed = FIELDS.some((f) => draft[f.name] !== values[f.name]);

  return (
    <div className="space-y-6">
      <form {...formProps} className="space-y-6">
        <input type="hidden" name="category" value={category} />
        {(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map((group) => (
          <fieldset key={group} className="min-w-0 space-y-5 rounded-2xl border border-ink/[0.09] bg-bone p-5">
            {/* Floated so the legend sits inside the card rather than on its border. */}
            <legend className="float-left mb-1 w-full font-mono text-[0.68rem] tracking-[0.14em] text-brass-deep uppercase">{GROUPS[group]}</legend>
            <div className="clear-both" />
            {FIELDS.filter((f) => f.group === group).map((f) => {
              const id = `c-${f.name}`;
              const value = draft[f.name];
              const shown = value || defaults[f.name];
              const limit = CONTENT_LIMITS[f.name];
              const isSeo = group === "seo";
              const length = shown.length;
              const over = value.length > limit;
              return (
                <FieldShell
                  key={f.name}
                  id={id}
                  label={f.label}
                  hint={f.hint}
                  error={error(f.name)}
                  aside={
                    <span
                      className={clsx("font-mono text-[0.7rem] tabular-nums", over ? "font-semibold text-signal" : isSeo && length > limit * 0.92 ? "text-amber" : "text-slate")}
                      aria-live={isSeo ? "polite" : undefined}
                    >
                      {value ? value.length : `${length} default`}/{limit}
                      {isSeo ? <span className="sr-only"> characters</span> : null}
                    </span>
                  }
                >
                  {f.multiline ? (
                    <textarea
                      name={f.name}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                      placeholder={defaults[f.name]}
                      rows={f.name === "heroSub" ? 3 : 2}
                      className={textareaClass("min-h-0 text-[0.92rem]")}
                      {...describe(id, { hint: Boolean(f.hint), error: error(f.name) })}
                    />
                  ) : (
                    <input
                      name={f.name}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                      placeholder={defaults[f.name]}
                      className={inputClass("text-[0.92rem]")}
                      {...describe(id, { hint: Boolean(f.hint), error: error(f.name) })}
                    />
                  )}
                  {f.emphasis ? (
                    <p className="mt-2 rounded-xl bg-field px-4 py-3 text-ivory" aria-label="Preview">
                      <span className="display block text-[1.6rem] leading-[1.05] [&_em]:!text-brass">
                        <Em text={shown} />
                      </span>
                    </p>
                  ) : null}
                </FieldShell>
              );
            })}
            {group === "seo" ? <SearchPreview title={draft.seoTitle || defaults.seoTitle} description={draft.seoDescription || defaults.seoDescription} href={liveHref} /> : null}
          </fieldset>
        ))}

        <FormMessage state={state} />
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 shadow-[0_12px_30px_-18px_rgb(13_19_17/0.4)] backdrop-blur">
          <p className="text-sm text-slate">{changed ? "You have unsaved changes." : "Empty fields use the default copy."}</p>
          <div className="flex gap-2">
            {changed ? (
              <button type="button" className={btn("ghost", "md")} onClick={() => setDraft(values)}>
                Discard
              </button>
            ) : null}
            <SubmitButton pending={pending} pendingLabel="Saving…" disabled={!changed}>
              Save and publish
            </SubmitButton>
          </div>
        </div>
      </form>
      <ResetForm category={category} hasOverrides={FIELDS.some((f) => values[f.name])} />
    </div>
  );
}

function SearchPreview({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white px-4 py-3" aria-label="Google result preview">
      <p className="text-[0.7rem] text-slate">greenfuturevehicles.com › {href.replace(/^\//, "")}</p>
      <p className="mt-0.5 truncate text-[1.05rem] leading-snug text-[#1a0dab]">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-[#4d5156]">{description}</p>
    </div>
  );
}

function ResetForm({ category, hasOverrides }: { category: string; hasOverrides: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, formProps } = useFormAction(resetLanding, { onSuccess: () => setConfirm(false), toastError: true });
  if (!hasOverrides) return null;
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-ink/15 px-5 py-4">
      <input type="hidden" name="category" value={category} />
      <p className="flex-1 text-sm text-slate">Reset clears every edit on this page and puts the original copy back.</p>
      {confirm ? (
        <>
          <SubmitButton pending={pending} variant="danger" pendingLabel="Resetting…">
            Yes, reset this page
          </SubmitButton>
          <button type="button" className={btn("ghost", "md")} onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className={btn("secondary", "md")} onClick={() => setConfirm(true)}>
          <RotateCcw aria-hidden />
          Reset to default
        </button>
      )}
    </form>
  );
}

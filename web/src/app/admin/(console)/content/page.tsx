import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ContentEditor, type ContentValues } from "@/components/admin/content-editor";
import { btn } from "@/components/admin/styles";
import { PageHeader } from "@/components/admin/ui";
import { landingPages } from "@/content/landing";
import { dateTime } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/guard";
import { landingKey, type LandingOverride } from "@/lib/content";
import { getDb, schema } from "@/lib/db/client";
import { inArray } from "drizzle-orm";
import type { Category } from "@/lib/vehicles";

export const metadata: Metadata = { title: "Content" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const PAGES: Array<{ category: Category; label: string }> = [
  { category: "tesla", label: "Sell my Tesla" },
  { category: "ev", label: "Sell my electric car" },
  { category: "van", label: "Sell my electric van" },
];

const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function ContentPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  const params = await searchParams;
  const current = PAGES.find((p) => p.category === params.page) ?? PAGES[0]!;
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.contentBlocks)
    .where(inArray(schema.contentBlocks.key, PAGES.map((p) => landingKey(p.category))));
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const base = landingPages[current.category];
  const row = byKey.get(landingKey(current.category));
  const o = (row?.data ?? {}) as LandingOverride;
  const defaults: ContentValues = {
    heroEyebrow: base.hero.eyebrow,
    heroHeadline: base.hero.headline,
    heroSub: base.hero.sub,
    heroCtaLabel: base.hero.ctaLabel,
    ctaHeading: base.cta.heading,
    ctaSub: base.cta.sub,
    seoTitle: base.seo.title,
    seoDescription: base.seo.description,
  };
  const values: ContentValues = {
    heroEyebrow: str(o.hero?.eyebrow),
    heroHeadline: str(o.hero?.headline),
    heroSub: str(o.hero?.sub),
    heroCtaLabel: str(o.hero?.ctaLabel),
    ctaHeading: str(o.cta?.heading),
    ctaSub: str(o.cta?.sub),
    seoTitle: str(o.seo?.title),
    seoDescription: str(o.seo?.description),
  };
  const liveHref = `/${base.slug}`;
  const editedCount = Object.values(values).filter(Boolean).length;
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Edit the words on the three paid-search landing pages. Changes go live as soon as you save."
        actions={
          <a href={liveHref} target="_blank" rel="noreferrer" className={btn("secondary", "md")}>
            <ExternalLink aria-hidden />
            View live page
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        }
      />

      <nav aria-label="Landing pages" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-ink/10">
          {PAGES.map((p) => {
            const active = p.category === current.category;
            const edited = byKey.has(landingKey(p.category));
            return (
              <li key={p.category}>
                <Link
                  href={`/admin/content?page=${p.category}` as Route}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap transition-colors",
                    active ? "border-racing font-medium text-ink" : "border-transparent text-slate hover:border-ink/20 hover:text-ink",
                  )}
                >
                  {p.label}
                  {edited ? <span className="rounded-full bg-[#f3e6cf] px-1.5 text-[0.65rem] font-medium tracking-wide text-brass-deep uppercase">Edited</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ContentEditor key={`${current.category}:${row?.updatedAt.getTime() ?? 0}`} category={current.category} defaults={defaults} values={values} liveHref={liveHref} />

        <aside className="space-y-4 text-sm text-slate xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-2xl border border-ink/[0.09] bg-bone p-5">
            <h2 className="font-semibold text-ink">How it works</h2>
            <ul className="mt-3 space-y-2.5 leading-relaxed">
              <li>Each box shows the current default in grey. Type to replace it; clear the box to go back to the default.</li>
              <li>
                Put <span className="font-mono text-ink">*asterisks*</span> around one or two words in a heading to set them in the quieter tone, like{" "}
                <span className="display text-[1.05rem] text-ink [&_em]:not-italic [&_em]:text-slate">
                  <em>this</em>
                </span>
                . Use them in pairs.
              </li>
              <li>Search titles are cut off after about 60 characters and descriptions after about 160.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-ink/[0.09] bg-bone p-5">
            <h2 className="font-semibold text-ink">{current.label}</h2>
            <p className="mt-2 leading-relaxed">
              {editedCount ? `${editedCount} of 8 fields edited.` : "Using the default copy."}
              {row ? (
                <>
                  {" "}
                  Last saved {dateTime(row.updatedAt, now)}
                  {row.updatedBy ? ` by ${row.updatedBy}` : ""}.
                </>
              ) : null}
            </p>
            <a href={liveHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.8rem] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
              {liveHref}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

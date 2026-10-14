import type { ReactNode } from "react";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { LegalToc } from "./legal-toc";

/** Long-form legal copy: a short cinematic title, then a calm pearl reading column with its contents alongside. */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <CinemaHero short label={eyebrow} word={eyebrow} title={title} sub={`Last updated ${updated}`} />
      <section className="on-pearl sheet pt-16 pb-28 sm:pt-24 sm:pb-36" data-nav-theme="pearl">
        <div className="container-page grid gap-12 lg:grid-cols-[16rem_minmax(0,46rem)] lg:justify-center lg:gap-20">
          <div className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <LegalToc target="legal-body" />
          </div>
          <div id="legal-body" className="prose-ion min-w-0">
            {children}
          </div>
        </div>
      </section>
    </>
  );
}

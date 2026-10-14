import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { DriveTimeline } from "@/components/cinema/drive-timeline";
import { RegEntry } from "@/components/marketing/reg-entry";
import { ComparisonTable, CtaBand, FaqSection, FeatureGrid, SectionHead, TalkStrip } from "@/components/marketing/sections";
import { Reveal } from "@/components/motion/reveal";
import { Chevron } from "@/components/ui/primitives";
import { shots } from "@/content/cars";
import { generalFaqs } from "@/content/shared";
import type { LandingContent } from "@/content/landing";
import { faqJsonLd, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import type { Category } from "@/lib/vehicles";
import { LandingStage } from "./landing-stage";

/** A second vehicle for each page's "what we buy" section. */
const modelsVisual: Record<Category, { src: StaticImageData; alt: string; name: string }> = {
  tesla: { src: shots.model3.src, alt: shots.model3.alt, name: shots.model3.name },
  ev: { src: shots.ariya.src, alt: shots.ariya.alt, name: shots.ariya.name },
  van: { src: shots.etransitCustom.src, alt: shots.etransitCustom.alt, name: shots.etransitCustom.name },
};

/** The shared body of the Tesla, electric car and electric van pages. */
export function LandingPage({ content }: { content: LandingContent }) {
  const faqs = [...content.faqs, ...generalFaqs.slice(0, 4)];
  const visual = modelsVisual[content.category];
  return (
    <>
      <LandingStage hero={content.hero} backdrop={content.backdrop} vehicle={content.vehicle} category={content.category} priced={content.priced} />

      <section className="on-pearl sheet py-24 sm:py-32" data-nav-theme="pearl">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead tone="pearl" heading={content.models.heading} sub={content.models.sub} />
            <figure className="relative mt-10">
              <div className="absolute inset-x-[6%] bottom-[2%] h-[14%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(13_15_18/0.2),transparent)]" />
              <Image src={visual.src} alt={visual.alt} sizes="(min-width: 1024px) 46vw, 92vw" quality={85} className="relative h-auto w-full" />
              <figcaption className="label mt-3 text-carbon-3">{visual.name}</figcaption>
            </figure>
          </div>
          <div>
            <Reveal as="ul" className="border-t border-carbon/12" stagger={0.06}>
              {content.models.items.map((m, i) => (
                <li key={m.name} className="group grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-carbon/12 py-8">
                  <span className="pt-2 font-mono text-[0.75rem] text-ion-deep">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-display text-[clamp(1.6rem,1.2rem+1.2vw,2.5rem)] leading-none font-medium tracking-[-0.035em] transition-transform duration-500 ease-glide group-hover:translate-x-1.5">
                      {m.name}
                    </span>
                    <span className="mt-3 block max-w-md leading-relaxed text-carbon-2">{m.detail}</span>
                  </span>
                </li>
              ))}
            </Reveal>
            <Link href="/brands" className="label chev-link mt-10 text-carbon">
              Every make and model we buy <Chevron />
            </Link>
          </div>
        </div>
      </section>

      {content.sellers ? (
        <section className="sheet bg-night-950 py-24 sm:py-32" data-nav-theme="night">
          <div className="container-page">
            <SectionHead heading={content.sellers.heading} sub={content.sellers.sub} />
            <Reveal className="mt-14">
              <FeatureGrid items={content.sellers.points} columns={3} />
            </Reveal>
          </div>
        </section>
      ) : null}

      <DriveTimeline className={content.sellers ? undefined : "sheet"} car={content.vehicle.kind === "side" ? content.vehicle.car : undefined} />

      <section className="on-pearl sheet pt-24 sm:pt-32" data-nav-theme="pearl">
        <div className="container-page">
          <SectionHead tone="pearl" label="Why a specialist" heading="Instant offers read your plate. *We read your vehicle.*" />
          <ComparisonTable className="mt-12" />
        </div>
      </section>

      <FaqSection faqs={faqs} />

      <CtaBand heading={content.cta.heading} sub={content.cta.sub} word={content.backdrop}>
        <RegEntry location={`landing-${content.category}-footer`} category={content.category} label={content.hero.ctaLabel} />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>

      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: content.nav, item: absoluteUrl(`/${content.slug}`) },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: content.nav,
          serviceType: "Vehicle purchase",
          provider: { "@type": "AutoDealer", name: site.brand.fullName, url: absoluteUrl("/") },
          areaServed: "GB",
          url: absoluteUrl(`/${content.slug}`),
          description: content.seo.description,
        }}
      />
    </>
  );
}

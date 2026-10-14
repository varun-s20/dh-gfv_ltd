import type { Metadata } from "next";
import Image from "next/image";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { DriveTimeline } from "@/components/cinema/drive-timeline";
import { RegEntry } from "@/components/marketing/reg-entry";
import { CtaBand, FaqList, SectionHead, TalkStrip } from "@/components/marketing/sections";
import { Reveal } from "@/components/motion/reveal";
import { heroCar } from "@/content/cars";
import { firmOfferChanges, generalFaqs } from "@/content/shared";
import { faqJsonLd, JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import technician from "../../../../public/media/photos/ev-technician-lab.jpg";

export const metadata: Metadata = {
  title: "How it works",
  description: `How selling your Tesla, electric car or van to ${site.brand.fullName} works: tell us about it, get one firm offer ${site.promises.quoteTurnaround}, get paid and collected.`,
  alternates: { canonical: "/how-it-works" },
};

const p = site.promises;

export default function HowItWorksPage() {
  const faqs = generalFaqs.slice(0, 5);
  return (
    <>
      <CinemaHero
        label="How it works"
        word="Drive"
        title="From your phone to *paid*, in three steps."
        sub="No haggling at your door, no auction, no call centre. One firm offer from someone who knows electric vehicles."
        visual={{ kind: "side", car: heroCar }}
      />

      <DriveTimeline />

      <section className="on-pearl sheet pt-24 pb-14 sm:pt-32 sm:pb-20" data-nav-theme="pearl">
        <div className="container-page grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <SectionHead
              tone="pearl"
              label="A firm offer means firm"
              heading="The price only moves if the vehicle *differs.*"
              sub="We publish the short list of things that can change an offer at collection. If one applies, we show you the evidence and agree it in writing first, or you can cancel at no cost."
            />
            <div className="relative mt-12 overflow-hidden rounded-[1.75rem]">
              <Image src={technician} alt="A technician reading an electric van's data on a laptop in a vehicle test workshop" sizes="(min-width: 1024px) 40vw, 92vw" className="aspect-[4/3] h-auto w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950/95 via-night-950/70 to-transparent p-6 pt-28 text-chalk">
                <p className="label text-chalk-2">Checked at collection</p>
                <p className="mt-1 font-display text-[1.25rem] font-medium tracking-[-0.02em]">Against your own answers and photos. Nothing else.</p>
              </div>
            </div>
          </div>
          <Reveal as="ul" className="self-end border-t border-carbon/12">
            {firmOfferChanges.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-carbon/12 py-8">
                <span className="pt-1.5 font-mono text-[0.78rem] text-ion-deep">0{i + 1}</span>
                <span>
                  <span className="block font-display text-[clamp(1.3rem,1.1rem+0.6vw,1.7rem)] font-medium tracking-[-0.025em]">{c.title}</span>
                  <span className="mt-2 block leading-relaxed text-carbon-2">{c.body}</span>
                </span>
              </li>
            ))}
            <li className="py-8 text-carbon-2">
              {p.noFees ? "No fees, ever. " : ""}
              {p.paidBeforeCollection ? "And you're paid before the keys leave your hand." : "We pay by bank transfer on collection."}
            </li>
          </Reveal>
        </div>
      </section>

      <section className="on-pearl pb-24 sm:pb-32" data-nav-theme="pearl">
        <div className="container-page grid gap-12 border-t border-carbon/10 pt-16 sm:pt-24 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead tone="pearl" heading="Before you *start.*" />
          <FaqList faqs={faqs} />
        </div>
      </section>

      <CtaBand heading="Two minutes from *now.*" sub={`Tell us about your vehicle and get one firm offer ${p.quoteTurnaround}.`} word="Start">
        <RegEntry location="how-it-works" />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>
      <JsonLd data={faqJsonLd(faqs)} />
    </>
  );
}

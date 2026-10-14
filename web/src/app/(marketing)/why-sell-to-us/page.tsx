import type { Metadata } from "next";
import Image from "next/image";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { SpecSheet } from "@/components/cinema/spec-sheet";
import { RegEntry } from "@/components/marketing/reg-entry";
import { ComparisonTable, CtaBand, FeatureGrid, SectionHead, TalkStrip } from "@/components/marketing/sections";
import { Reveal } from "@/components/motion/reveal";
import { heroCar } from "@/content/cars";
import { promises } from "@/content/shared";
import { site } from "@/lib/site";
import dashboard from "../../../../public/media/photos/ev-dashboard-battery.jpg";

export const metadata: Metadata = {
  title: "Why sell to us",
  description: `Why sell your electric vehicle to ${site.brand.fullName}: specialists who price battery health, software and the exact version, with one firm offer and no fees.`,
  alternates: { canonical: "/why-sell-to-us" },
};

const reasons = [
  { title: "We only buy electric", body: "Teslas, electric cars and electric vans are all we do, so we know what each version, battery and option is really worth." },
  { title: "A person prices every vehicle", body: "No algorithm guessing from your registration. Someone reads your answers and looks at your photos before sending a figure." },
  { title: "The battery is priced properly", body: "State of health, warranty left and charging history are part of the offer, so a well-kept battery is paid for." },
  { title: "Firm means firm", body: "If the vehicle matches what you told us, the price doesn't change at your door. We publish the short list of things that can." },
];

const specPoints = [
  { title: "The battery, first", body: "State of health, warranty left and how it's been charged. It's the most valuable part of an electric vehicle, so it leads the price.", x: 48.6, y: 81 },
  { title: "The exact version", body: "Performance or Long Range, the pack size, heat pump and options. The badge on the boot rarely tells the whole story.", x: 45, y: 30 },
  { title: "Wheels, brakes and tyres", body: "Kerbed rims, tyre tread and upgraded brakes all show up in your photos, so nothing is a surprise at the door.", x: 18.9, y: 71.9 },
  { title: "Charging kit and history", body: "Cables in the boot, rapid-charging habits and the service record. Tell us once and it's priced in.", x: 88.5, y: 40 },
];

export default function WhyPage() {
  return (
    <>
      <CinemaHero
        label="Why sell to us"
        word="Specialist"
        title="Electric specialists, *not generalists with a plug-in page.*"
        sub="We price the things that make an electric vehicle valuable, and we tell you exactly how the offer was reached."
        visual={{ kind: "xray", car: heroCar }}
      />

      <section className="bg-night-950 pb-10" data-nav-theme="night">
        <div className="container-page">
          <dl className="grid grid-cols-2 gap-y-8 border-y hairline py-10 lg:grid-cols-4">
            {promises.map((s) => (
              <div key={s.label} className="pr-4 lg:border-r lg:hairline lg:last:border-r-0 lg:[&:not(:first-child)]:pl-8">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block font-display text-[clamp(2rem,1.4rem+2vw,3.4rem)] leading-none font-medium tracking-[-0.04em]">{s.value}</span>
                  <span className="mt-3 block text-chalk-2">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <SpecSheet car={heroCar} heading="Everything that *sets the price.*" points={specPoints} />

      <section className="on-pearl sheet py-24 sm:py-32" data-nav-theme="pearl">
        <div className="container-page">
          <SectionHead tone="pearl" label="Side by side" heading="Instant offers read your plate. *We read your vehicle.*" />
          <ComparisonTable className="mt-12" />
        </div>
      </section>

      <section className="relative bg-night-950 py-24 sm:py-32" data-nav-theme="night">
        <div className="container-page grid gap-14 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:gap-20">
          <div className="relative overflow-hidden rounded-[1.75rem] max-xl:max-w-2xl">
            <Image src={dashboard} alt="An electric car's dashboard showing its battery charge, range and charging settings" sizes="(min-width: 1024px) 46vw, 92vw" className="h-auto w-full" />
          </div>
          <div>
            <SectionHead label="Why it matters" heading="Four reasons sellers *choose us.*" />
            <Reveal className="mt-10">
              <FeatureGrid items={reasons} columns={2} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="on-pearl sheet py-24 sm:py-28" data-nav-theme="pearl">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="display text-d2">
            Who <em>we are.</em>
          </h2>
          <div className="max-w-2xl space-y-4 text-lead text-carbon-2">
            <p>
              {site.company.legalName} is an independent UK company that buys electric vehicles: Teslas, electric cars and electric vans, from private sellers, businesses and
              fleets.
            </p>
            <p>
              We&apos;re registered in {site.company.registeredIn} (company {site.company.companyNumber}) and our showroom is in {site.company.showroom}.
            </p>
          </div>
        </div>
      </section>

      <CtaBand heading="See what yours is *really worth.*" sub={`One firm offer ${site.promises.quoteTurnaround}, from a person.`} word="Value">
        <RegEntry location="why-sell-to-us" />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>
    </>
  );
}

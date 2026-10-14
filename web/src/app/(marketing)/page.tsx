import type { Metadata } from "next";
import { ExpandingMedia } from "@/components/home/expanding-media";
import { HomeStory } from "@/components/home/story";
import { WeBuy } from "@/components/home/we-buy";
import { RegEntry } from "@/components/marketing/reg-entry";
import { ComparisonTable, CtaBand, FaqSection, SectionHead, TalkStrip } from "@/components/marketing/sections";
import { fleet } from "@/content/fleet";
import { generalFaqs, promises } from "@/content/shared";
import { faqJsonLd, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import interior from "../../../public/media/photos/model3-interior.jpg";

export const metadata: Metadata = {
  title: { absolute: `Sell your Tesla, electric car or van | ${site.brand.fullName}` },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <HomeStory />

      <ExpandingMedia
        image={interior}
        alt="Inside a right-hand-drive Tesla Model 3, looking forward past the wheel and touchscreen"
        heading={
          <>
            Priced by a person. <em>Not a postcode algorithm.</em>
          </>
        }
        sub="Everything you tell us is read by someone who buys electric vehicles for a living. That's how a well-kept car gets the price it deserves."
        stats={promises}
      />

      <WeBuy vehicles={fleet} />

      <section className="on-pearl pb-24 sm:pb-32" data-nav-theme="pearl">
        <div className="container-page">
          <SectionHead
            tone="pearl"
            label="Why sell to a specialist"
            heading="Instant offers read your plate. *We read your car.*"
            sub="The difference shows up in the one place it counts: the price you're actually paid."
          />
          <ComparisonTable className="mt-12" />
        </div>
      </section>

      <FaqSection faqs={generalFaqs.slice(0, 6)} />

      <CtaBand heading="Ready when *you are.*" sub={`Two minutes to tell us about it. One firm offer ${site.promises.quoteTurnaround}.`}>
        <RegEntry location="home-footer" />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: site.brand.fullName,
          legalName: site.company.legalName,
          url: absoluteUrl("/"),
          telephone: site.contact.phoneE164,
          address: { "@type": "PostalAddress", streetAddress: site.company.registeredOffice, addressCountry: "GB" },
          areaServed: "GB",
          description: site.brand.tagline,
        }}
      />
      <JsonLd data={faqJsonLd(generalFaqs.slice(0, 6))} />
    </>
  );
}

import type { Metadata } from "next";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { RegEntry } from "@/components/marketing/reg-entry";
import { CtaBand, FaqList, TalkStrip } from "@/components/marketing/sections";
import { WhatsAppIcon } from "@/components/ui/primitives";
import { evPage, teslaPage, vanPage } from "@/content/landing";
import { generalFaqs } from "@/content/shared";
import { faqJsonLd, JsonLd } from "@/lib/seo";
import { site, whatsappLink } from "@/lib/site";
import charging from "../../../../public/media/photos/ev-charging-dusk.jpg";

export const metadata: Metadata = {
  title: "Questions and answers",
  description: `Answers about selling your Tesla, electric car or van to ${site.brand.fullName}: offers, payment, finance, collection, battery health and fees.`,
  alternates: { canonical: "/faq" },
};

const groups = [
  { id: "selling", title: "Selling to us", faqs: generalFaqs },
  { id: "tesla", title: "Teslas", faqs: teslaPage.faqs },
  { id: "electric-cars", title: "Electric cars", faqs: evPage.faqs },
  { id: "vans", title: "Electric vans", faqs: vanPage.faqs },
];

export default function FaqPage() {
  const all = groups.flatMap((g) => g.faqs);
  return (
    <>
      <CinemaHero
        short
        label="Questions"
        word="Asked"
        title="Everything people *ask us.*"
        sub="Can't see yours? Message us on WhatsApp and a specialist will answer."
        visual={{ kind: "photo", src: charging, alt: "A charging cable plugged into an electric car at a street charger at dusk" }}
      />

      <section className="on-pearl sheet py-20 sm:py-28" data-nav-theme="pearl">
        <div className="container-page grid gap-12 lg:grid-cols-[17rem_1fr] lg:gap-20">
          <nav aria-label="Question topics" className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow text-carbon-3">Topics</p>
            <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {groups.map((g) => (
                <li key={g.id}>
                  <a
                    href={`#${g.id}`}
                    className="label flex items-center justify-between gap-6 rounded-full px-4 py-2.5 text-carbon-2 ring-1 ring-carbon/12 transition-colors hover:bg-carbon hover:text-pearl-50 lg:rounded-xl lg:ring-0"
                  >
                    {g.title}
                    <span className="hidden font-mono text-[0.7rem] text-carbon-3 lg:inline">{String(g.faqs.length).padStart(2, "0")}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={whatsappLink("Hi, I have a question about selling my vehicle.")}
              target="_blank"
              rel="noopener"
              className="mt-8 hidden items-center gap-3 rounded-2xl bg-carbon p-4 text-pearl-50 transition-transform duration-300 hover:-translate-y-0.5 lg:flex"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-ion text-night-950">
                <WhatsAppIcon className="size-5" />
              </span>
              <span>
                <span className="block font-display font-medium">Ask a specialist</span>
                <span className="block text-[0.82rem] text-chalk-2">{site.contact.hours}</span>
              </span>
            </a>
          </nav>
          <div className="space-y-20">
            {groups.map((g) => (
              <div key={g.id} id={g.id} className="scroll-mt-28">
                <h2 className="display mb-6 text-d3">{g.title}</h2>
                <FaqList faqs={g.faqs} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand heading="Ready for a *number?*" sub={`One firm offer ${site.promises.quoteTurnaround}.`}>
        <RegEntry location="faq" />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>
      <JsonLd data={faqJsonLd(all)} />
    </>
  );
}

import type { Metadata } from "next";
import { BrandDirectory } from "@/components/brands/directory";
import { BrandShowroom, type ShowroomItem } from "@/components/brands/showroom";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { RegEntry } from "@/components/marketing/reg-entry";
import { CtaBand, SectionHead, TalkStrip } from "@/components/marketing/sections";
import { fleet } from "@/content/fleet";
import { CAR_MAKES, VAN_MAKES } from "@/lib/vehicles";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Brands we buy",
  description: `Every electric make and model ${site.brand.fullName} buys: Tesla, BYD, Kia, Hyundai, Volkswagen, Porsche, Audi, BMW, Mercedes-Benz, Nissan, MG, Polestar, Ford, Vauxhall and more.`,
  alternates: { canonical: "/brands" },
};

/** The makes in the showroom, each with one of its vehicles from the turntable set. */
const featured: Array<{ make: string; slug: string; href: ShowroomItem["href"] }> = [
  { make: "Tesla", slug: "tesla-model-3", href: "/sell-my-tesla" },
  { make: "BYD", slug: "byd-atto-3", href: "/sell-my-electric-car" },
  { make: "Porsche", slug: "porsche-taycan", href: "/sell-my-electric-car" },
  { make: "Kia", slug: "kia-ev3", href: "/sell-my-electric-car" },
  { make: "Mercedes-Benz", slug: "mercedes-eqe", href: "/sell-my-electric-car" },
  { make: "Hyundai", slug: "hyundai-ioniq-5", href: "/sell-my-electric-car" },
  { make: "Audi", slug: "audi-etron-gt", href: "/sell-my-electric-car" },
  { make: "Volkswagen", slug: "vw-id3", href: "/sell-my-electric-car" },
  { make: "MG", slug: "mg4", href: "/sell-my-electric-car" },
  { make: "Nissan", slug: "nissan-leaf", href: "/sell-my-electric-car" },
  { make: "Peugeot", slug: "peugeot-e208", href: "/sell-my-electric-car" },
  { make: "Vauxhall", slug: "vauxhall-vivaro-electric", href: "/sell-my-electric-van" },
];

const modelCount = (make: string) => new Set([...(CAR_MAKES.find((m) => m.make === make)?.models ?? []), ...(VAN_MAKES.find((m) => m.make === make)?.models ?? [])]).size;

const showroom: ShowroomItem[] = featured.flatMap(({ make, slug, href }) => {
  const vehicle = fleet.find((v) => v.slug === slug);
  return vehicle ? [{ make, vehicle, href, models: modelCount(make) }] : [];
});

export default function BrandsPage() {
  return (
    <>
      <CinemaHero
        label="Brands we buy"
        word="Every make"
        title="Every make. *Every model.*"
        sub="If it's fully electric and registered in the UK, we want to see it. From a first-generation Leaf to the latest Ioniq 5 N."
        visual={{ kind: "shot", shot: "ioniq5", width: "w-[98vw] sm:w-[94vw] md:w-[86vw] lg:w-[min(60vw,100svh)]" }}
      />

      <section className="bg-night-950 pb-24 sm:pb-32" data-nav-theme="night">
        <div className="container-page">
          <SectionHead label="The ones we see most" heading="Pull up. *We know these well.*" sub="The makes and models we price every week. Choose yours to start." />
          <div className="mt-12">
            <BrandShowroom items={showroom} />
          </div>
        </div>
      </section>

      <section className="on-pearl sheet py-24 sm:py-32" data-nav-theme="pearl">
        <div className="container-page">
          <SectionHead
            tone="pearl"
            label="A to Z"
            heading="Find yours. *Every make, every model.*"
            sub="Search by make or model, or narrow it to cars or vans. Not here? Choose “Other” in the form and we'll still price it."
          />
          <div className="mt-12">
            <BrandDirectory cars={CAR_MAKES} vans={VAN_MAKES} />
          </div>
        </div>
      </section>

      <CtaBand heading="Whatever it is, *we'll price it.*" sub={`One firm offer ${site.promises.quoteTurnaround}.`} word="Any EV">
        <RegEntry location="brands" />
        <div className="mt-6">
          <TalkStrip />
        </div>
      </CtaBand>
    </>
  );
}

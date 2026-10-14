import { eVito, ioniq6, model3, type ShotKey, type SideProfile } from "@/content/cars";
import type { Category } from "@/lib/vehicles";
import { site } from "@/lib/site";
import type { Faq, Feature } from "./shared";

/**
 * The three paid-search landing pages. Headlines may put *asterisks* around a
 * phrase to set it in the quieter tone. The hero, closing call to action and SEO
 * fields can be overridden from the admin "Content" screen (src/lib/content.ts).
 */

export type LandingVehicle = { kind: "side"; car: SideProfile } | { kind: "shot"; shot: ShotKey };

export type LandingContent = {
  slug: "sell-my-tesla" | "sell-my-electric-car" | "sell-my-electric-van";
  category: Category;
  nav: string;
  seo: { title: string; description: string };
  hero: { eyebrow: string; headline: string; sub: string; ctaLabel: string };
  /** The giant word standing behind the car. */
  backdrop: string;
  /** The vehicle on the opening stage: side-on (its wheels roll as it moves) or a three-quarter shot. */
  vehicle: LandingVehicle;
  priced: { heading: string; sub: string; points: Feature[] };
  models: { heading: string; sub: string; items: Array<{ name: string; detail: string }> };
  sellers?: { heading: string; sub: string; points: Feature[] };
  faqs: Faq[];
  cta: { heading: string; sub: string };
};

const p = site.promises;

export const teslaPage: LandingContent = {
  slug: "sell-my-tesla",
  category: "tesla",
  nav: "Sell my Tesla",
  seo: {
    title: "Sell my Tesla | A firm offer from a Tesla specialist",
    description:
      "Sell your Tesla Model 3, Model Y, Model S or Model X to a UK EV specialist. Battery health, Full Self-Driving and upgrades priced in. One firm offer by WhatsApp or email.",
  },
  hero: {
    eyebrow: "Tesla specialists",
    headline: "Sell your Tesla to people who *know Teslas.*",
    sub: "Battery health, software and the version you actually own, priced by a person. One firm offer, no haggling at your door.",
    ctaLabel: "Get my Tesla offer",
  },
  backdrop: "Tesla",
  vehicle: { kind: "side", car: model3 },
  priced: {
    heading: "We price the parts of a Tesla that *matter.*",
    sub: "Instant valuation sites read your registration and guess. We look at the car you actually have.",
    points: [
      { title: "Battery health", body: "Newer software can run a battery health test from the touchscreen. Send us the figure, or a screenshot, and a healthy pack gets paid for." },
      { title: "Full Self-Driving and Enhanced Autopilot", body: "Bought outright or on subscription makes a real difference. Tell us which and we price it in." },
      { title: "The exact version", body: "Standard Range, Long Range, Performance, Plaid. Highland or Juniper. Wheels, seats and colour. Every detail moves the figure." },
      { title: "Its history", body: "Tesla service records, warranty left on the battery and drive unit, and any repairs. A well-looked-after car should sell like one." },
    ],
  },
  models: {
    heading: "Every Tesla, *every year.*",
    sub: "Imports, high miles and cars still on finance included.",
    items: [
      { name: "Model 3", detail: "Standard Range to Performance, including the 2023 Highland update." },
      { name: "Model Y", detail: "Rear-wheel drive, Long Range and Performance, including Juniper." },
      { name: "Model S", detail: "From the early 70 and 85 kWh cars to Plaid." },
      { name: "Model X", detail: "Five, six and seven seats, 75D to Plaid." },
    ],
  },
  faqs: [
    { q: "Do you price Full Self-Driving?", a: "Yes. Tell us whether it was bought outright, bought as an upgrade or is a monthly subscription. Software you bought can add real value, so we check it and price it in." },
    { q: "Where do I find my battery health?", a: "Newer Tesla software can run a battery health test from the Service menu. If yours can't, the range shown at 100% charge is a good guide. Add either to the form, or leave it blank." },
    { q: "Do you buy high-mileage Teslas?", a: "Yes. Teslas often cover big miles, and battery health tells us more than the odometer. Tell us the mileage and battery health and we'll price it fairly." },
    { q: "My Tesla is still on finance. Is that OK?", a: p.financeSettled ? "Yes. We settle the finance with your lender directly, including Tesla Financial Services, and pay you the difference." : "Yes. Tell us who the finance is with and we'll explain how it works." },
  ],
  cta: {
    heading: "Your Tesla, *priced properly.*",
    sub: `Two minutes to tell us about it. One firm offer ${p.quoteTurnaround}.`,
  },
};

export const evPage: LandingContent = {
  slug: "sell-my-electric-car",
  category: "ev",
  nav: "Sell my electric car",
  seo: {
    title: "Sell my electric car | A firm offer from an EV specialist",
    description:
      "Sell your electric car to a UK EV specialist: Nissan Leaf, MG4, Kia, Hyundai, Volkswagen, BMW, Polestar and more. Battery health priced in. One firm offer by WhatsApp or email.",
  },
  hero: {
    eyebrow: "Every make, every year",
    headline: "Sell your electric car to people who *get electric.*",
    sub: "From a 2013 Leaf to a Taycan Turbo S. A person prices the battery, the range and the car you actually own.",
    ctaLabel: "Get my offer",
  },
  backdrop: "EV",
  vehicle: { kind: "side", car: ioniq6 },
  priced: {
    heading: "An EV is worth what its *battery* is worth.",
    sub: "Generalist buyers price an electric car like a petrol one. We start where the value is.",
    points: [
      { title: "Battery health and range", body: "State of health, real-world range and how it's been charged. A strong battery should mean a strong offer." },
      { title: "Charging kit", body: "Type 2 cables, granny leads and CHAdeMO adaptors. Tell us what's in the boot." },
      { title: "Battery lease and warranty", body: "Battery hire on an older Renault, and the years left on a manufacturer battery warranty, are both priced in properly." },
      { title: "Heat pumps and packs", body: "The right battery size and options (heat pump, towbar, upgraded charging) can be worth more than the badge." },
    ],
  },
  models: {
    heading: "Whatever plugs in, *we buy.*",
    sub: "These are some of the cars we price most often. If yours isn't here, we still want to see it.",
    items: [
      { name: "Nissan Leaf", detail: "24 kWh to e+ 62 kWh, every generation." },
      { name: "MG4 and ZS EV", detail: "SE, Trophy, Long Range and XPower." },
      { name: "Hyundai and Kia", detail: "Ioniq 5, Ioniq 6, Kona, EV6, EV9, Niro and e-Niro." },
      { name: "Volkswagen group", detail: "ID.3, ID.4, ID.5, ID.7, ID. Buzz, Skoda Enyaq and Cupra Born." },
      { name: "Premium", detail: "Polestar, BMW i, Audi e-tron, Mercedes EQ, Porsche Taycan and Jaguar I-Pace." },
      { name: "City cars", detail: "Fiat 500e, Renault Zoe and 5, Peugeot e-208, Vauxhall Corsa Electric, MINI Electric." },
    ],
  },
  faqs: [
    { q: "Do you buy older EVs like early Nissan Leafs?", a: "Yes. Older EVs are where battery health matters most. Tell us the range you get and the number of battery bars, and we'll price it fairly." },
    { q: "My Renault has a leased battery. Can I sell it?", a: "Yes. Tell us it's on battery hire in the form and we'll explain your options before you accept anything." },
    { q: "Do I need to include the charging cables?", a: "Include what you have. Missing cables lower the value slightly, so we ask about them up front rather than at your door." },
    { q: "Which makes don't you buy?", a: "If it's fully electric and road-registered in the UK, we'll look at it. Plug-in hybrids aren't our specialism, but get in touch and we'll be honest." },
  ],
  cta: {
    heading: "Your EV, *priced by a person.*",
    sub: `Two minutes to tell us about it. One firm offer ${p.quoteTurnaround}.`,
  },
};

export const vanPage: LandingContent = {
  slug: "sell-my-electric-van",
  category: "van",
  nav: "Sell my electric van",
  seo: {
    title: "Sell my electric van | One van or a whole fleet",
    description:
      "Sell your electric van to a UK EV specialist: Ford E-Transit, Vauxhall Vivaro Electric, Nissan e-NV200, Maxus eDeliver, Volkswagen ID. Buzz Cargo and more. Business and private sellers.",
  },
  hero: {
    eyebrow: "Electric vans and fleets",
    headline: "Sell your electric van *without the runaround.*",
    sub: "One van or a whole fleet. Racking, livery and VAT handled properly, and one firm offer from a specialist.",
    ctaLabel: "Get my van offer",
  },
  backdrop: "Vans",
  vehicle: { kind: "side", car: eVito },
  priced: {
    heading: "We price vans like *working vehicles.*",
    sub: "What's fitted, how it's been used and what the battery has left all matter to the next owner. We price all of it.",
    points: [
      { title: "Battery and range", body: "Payload eats range, so battery health matters even more in a van. Tell us what it does on a typical day." },
      { title: "Fitted equipment", body: "Racking, ply lining, tow bars and conversions can add value. Livery doesn't put us off." },
      { title: "VAT status", body: "VAT-qualifying vans are priced as such, with a proper VAT invoice for your books." },
      { title: "Fleet condition", body: "Selling several? We price each one on its own merits and collect together at a time that suits your operation." },
    ],
  },
  models: {
    heading: "From city vans to *large panel vans.*",
    sub: "Small, medium and large, panel van or crew cab.",
    items: [
      { name: "Ford", detail: "E-Transit, E-Transit Custom and E-Transit Courier." },
      { name: "Stellantis vans", detail: "Vauxhall Vivaro and Combo Electric, Peugeot e-Expert, Citroën ë-Dispatch, Fiat E-Scudo." },
      { name: "Nissan", detail: "e-NV200 and Townstar EV." },
      { name: "Maxus", detail: "eDeliver 3, 5, 7 and 9." },
      { name: "Volkswagen", detail: "ID. Buzz Cargo, e-Crafter and e-Transporter." },
      { name: "Mercedes-Benz and Renault", detail: "eVito, eSprinter, eCitan and Kangoo E-Tech." },
    ],
  },
  sellers: {
    heading: "Private, sole trader or *fleet.*",
    sub: "Selling through a business is just as simple.",
    points: [
      { title: "Limited companies and sole traders", body: "We buy from businesses of every size and pay the business account." },
      { title: "Fleets and multiple vans", body: "Send them in one form or call us. Each van gets its own price." },
      { title: "Finance and lease-purchase", body: p.financeSettled ? "Outstanding finance is settled with the lender as part of the sale." : "Tell us who the finance is with and we'll explain how it works." },
    ],
  },
  faqs: [
    { q: "Do you buy vans from businesses?", a: "Yes. Most of the vans we buy come from sole traders and limited companies. Choose 'business' in the form and we'll price VAT correctly." },
    { q: "Can you take several vans at once?", a: "Yes. Tell us how many in the form, or call us, and we'll price each van and collect them together." },
    { q: "My van has racking and livery. Is that a problem?", a: "No. Tell us what's fitted. Good racking can add value, and livery doesn't stop us buying." },
    { q: "Is the price VAT-inclusive?", a: "For VAT-qualifying vans we'll make it clear whether the figure includes VAT, and provide the paperwork you need." },
  ],
  cta: {
    heading: "Your van, *priced to work.*",
    sub: `Two minutes per van. One firm offer ${p.quoteTurnaround}.`,
  },
};

export const landingPages: Record<Category, LandingContent> = { tesla: teslaPage, ev: evPage, van: vanPage };

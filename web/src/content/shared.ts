import { site } from "@/lib/site";

/**
 * Copy shared across pages. Anything that makes a commercial promise reads its
 * flag from site.promises, so an unconfirmed promise disappears everywhere at once.
 */

export type Faq = { q: string; a: string };
export type Feature = { title: string; body: string };

const p = site.promises;

/** Short promises for stat rows and trust strips. Only confirmed ones are shown. */
export const promises: Array<{ value: string; label: string }> = [
  { value: "1", label: `firm offer, ${p.quoteTurnaround}` },
  ...(p.noFees ? [{ value: "£0", label: "fees, ever" }] : []),
  ...(p.freeCollection ? [{ value: "Free", label: "collection from your door" }] : []),
  { value: `${p.offerValidDays} days`, label: "to decide, no pressure" },
];

export const processSteps: Feature[] = [
  {
    title: "Tell us about it",
    body: "Registration, mileage, condition and battery health, plus a few photos. About two minutes on your phone.",
  },
  {
    title: "A specialist prices it",
    body: `Someone who buys electric vehicles every day reads every answer and looks at every photo, then sends one firm offer ${p.quoteTurnaround}, by WhatsApp or email.`,
  },
  {
    title: p.paidBeforeCollection ? "Paid, then collected" : "Collected and paid",
    body: [
      "Accept online and we agree a time that suits you.",
      p.paidBeforeCollection ? "The money is in your account before the keys leave your hand." : "We pay by bank transfer on collection.",
      p.freeCollection ? "Collection from your door is free." : "",
      p.financeSettled ? "Any finance is settled with your lender for you." : "",
    ]
      .filter(Boolean)
      .join(" "),
  },
];

/** What can change a firm offer at collection. The terms quote this list, so keep them in step. */
export const firmOfferChanges: Feature[] = [
  { title: "Something we didn't know about", body: "Damage, a warning light or a missing key that wasn't in your answers or photos." },
  { title: "A different mileage", body: "More than 1,000 miles above what you told us." },
  { title: "Finance or paperwork", body: "Outstanding finance that differs from the figure you gave, or a V5C that isn't in your name." },
];

export type Comparison = { label: string; us: string; them: string };

export const comparison: Comparison[] = [
  { label: "Who sets the price", them: "An algorithm reading your registration", us: "A specialist reading your answers and photos" },
  { label: "Battery health", them: "Rarely asked about", us: "Asked for, checked and priced in" },
  { label: "Software and upgrades", them: "Usually ignored", us: "Full Self-Driving, Autopilot and extras priced" },
  { label: "The price at your door", them: "Often reworked at inspection", us: "Firm. It only moves if something differs, and we show you why" },
  ...(p.noFees ? [{ label: "Fees", them: "Admin or transfer fees are common", us: "None. The offer is what you're paid" }] : []),
  { label: "How you hear back", them: "Email or a call centre", us: "WhatsApp or email, from a person" },
];

export const generalFaqs: Faq[] = [
  {
    q: "How do you work out my offer?",
    a: "A specialist looks at what you've told us and the photos you send: the exact model and version, mileage, condition, battery health, software, extras and recent sales of similar vehicles. Then they send one firm figure. No algorithm guesses from your registration alone.",
  },
  {
    q: "Is the offer really firm?",
    a: `Yes. If the vehicle matches what you told us, that's the price. It can only change for ${firmOfferChanges.length} published reasons: ${firmOfferChanges.map((c) => c.body.replace(/\.$/, "").toLowerCase()).join("; ")}. If one applies we show you the evidence and agree any change in writing first, or you can cancel at no cost.`,
  },
  {
    q: "How quickly will I hear back?",
    a: `Usually ${p.quoteTurnaround}. Your offer comes by WhatsApp or email, whichever you choose, and stays valid for ${p.offerValidDays} days.`,
  },
  {
    q: "How and when do I get paid?",
    a: p.paidBeforeCollection
      ? "By bank transfer, before we take the keys. You'll see the money land, then we drive away."
      : "By bank transfer when we collect the vehicle.",
  },
  ...(p.financeSettled
    ? [
        {
          q: "Can I sell if there's finance outstanding?",
          a: "Yes. Tell us who the finance is with. We get the settlement figure, pay your lender directly and pay you any difference. On a lease (PCH) the vehicle belongs to the leasing company, so speak to us and we'll tell you honestly what's possible.",
        },
      ]
    : []),
  ...(p.noFees ? [{ q: "Do you charge any fees?", a: "No. The offer is the amount you receive. There's nothing to pay for collection, transfer or admin." }] : []),
  {
    q: "Do I need to know my battery health?",
    a: "It helps, because a healthy battery is worth paying more for. Many EVs show it in a service or battery menu, and Teslas can run a battery health test from the touchscreen. If you can't find it, leave it blank and we'll work from range, mileage and age.",
  },
  {
    q: "Do you buy damaged, high-mileage or older EVs?",
    a: "Yes. Early Nissan Leafs, high-mileage Teslas, cars with marks or faults and vehicles on warning lights are all fine. Tell us honestly and send photos, and the offer will reflect the vehicle as it is.",
  },
  {
    q: "What do I need when you collect?",
    a: "The V5C logbook, every key or key card, the charging cables you have, and photo ID. We'll send a short checklist with your offer.",
  },
  {
    q: "What happens to my details?",
    a: "We use them only to price your vehicle and talk to you about it. We don't sell your data, and you can ask us to delete it at any time. The privacy notice has the detail.",
  },
];

/** Names for the rotating "we buy" list. */
export const weBuy = [
  "Model 3",
  "Model Y",
  "Nissan Leaf",
  "MG4",
  "Hyundai Ioniq 5",
  "Kia EV6",
  "Volkswagen ID.3",
  "Polestar 2",
  "BMW i4",
  "Model S",
  "Renault Zoe",
  "Ford E-Transit",
  "Vauxhall Vivaro Electric",
  "Maxus eDeliver",
];

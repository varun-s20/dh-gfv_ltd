/**
 * Single source of truth for brand, company and commercial promises.
 *
 * Values marked CONFIRM come from public records (Companies House, the client's
 * dealership website) or from the research pack's recommended offer. Every one
 * must be confirmed in writing by the client before launch — see LAUNCH.md.
 */

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them
// into client bundles; `clean` only normalises empty strings to undefined.
const clean = (value: string | undefined) => (value && value.trim() !== "" ? value.trim() : undefined);

export const site = {
  /** Consumer-facing brand. CONFIRM: brand decision is still open with the client. */
  brand: {
    name: "Green Future",
    descriptor: "EV buyers",
    fullName: "Green Future Vehicles",
    tagline: "The specialist buyer for Teslas, electric cars and electric vans.",
  },

  url: (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(/\/$/, ""),

  /**
   * Legal identity. UK law requires a limited company's website to show its
   * registered name, number, registered office and place of registration.
   */
  company: {
    legalName: "Green Future Vehicles Limited", // CONFIRM
    companyNumber: "15763505", // CONFIRM (Companies House)
    registeredIn: "England and Wales",
    registeredOffice: "1st Floor, 87-89 High Street, Hoddesdon, Hertfordshire, EN11 8TL", // CONFIRM
    vatNumber: "GB 475924060", // CONFIRM (shown on the client's dealership site)
    icoNumber: clean(process.env.NEXT_PUBLIC_ICO_NUMBER), // REQUIRED before launch
    showroom: "Hertford, by appointment", // CONFIRM
  },

  contact: {
    phoneDisplay: clean(process.env.NEXT_PUBLIC_PHONE_DISPLAY) ?? "020 3051 0406", // CONFIRM
    phoneE164: clean(process.env.NEXT_PUBLIC_PHONE_E164) ?? "+442030510406", // CONFIRM
    /** WhatsApp Business number in international format without "+". */
    whatsapp: clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ?? "442030510406", // CONFIRM
    email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL), // REQUIRED before launch
    hours: clean(process.env.NEXT_PUBLIC_OPENING_HOURS) ?? "Monday to Saturday, 9am to 6pm", // CONFIRM
  },

  /**
   * Commercial promises shown across the site and in ads. Each flag switches the
   * related copy on or off everywhere, so an unconfirmed promise can be removed
   * in one place. CONFIRM every flag with the client.
   */
  promises: {
    noFees: true,
    freeCollection: true,
    paidBeforeCollection: true,
    financeSettled: true,
    /** Days a written offer stays valid. */
    offerValidDays: 7,
    /** How quickly a specialist replies with a price, in plain words. */
    quoteTurnaround: "the same working day",
    /** The published, short list of things that can change an offer at collection. */
    firmOffer: true,
  },

  social: {
    // Add the client's profiles when supplied; empty entries are hidden.
    instagram: clean(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
    facebook: clean(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK),
    linkedin: clean(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
  },

  analytics: {
    gtmId: clean(process.env.NEXT_PUBLIC_GTM_ID),
  },

  turnstileSiteKey: clean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
} as const;

export const whatsappLink = (text?: string) => {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

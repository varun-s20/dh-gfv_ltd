import "server-only";

import type { Lead } from "@/lib/db/schema";
import { gbp, sellerOfferEmail, ukDate, whatsappOffer, type LeadForEmail } from "@/lib/notify/templates";
import { site } from "@/lib/site";

/**
 * Offer previews for the quote builder. Rather than re-writing the copy in the
 * browser (and letting it drift from what sellers actually receive), the real
 * templates are rendered once on the server with sentinel values, which are
 * then swapped for {{tokens}} that the client fills in as Danny types.
 */

export type OfferPreviewTemplate = { subject: string; emailText: string; whatsapp: string; whatsappTemplate: string };

const SENTINEL_PENCE = 987_654_321_00;
const SENTINEL_DATE = new Date(Date.UTC(2099, 11, 31, 12));
const SENTINEL_CONDITIONS = "⁣CONDITIONS⁣";
const LINK_TOKEN = "your-offer-link";

export function leadForEmail(lead: Lead): LeadForEmail {
  return {
    ref: lead.ref,
    fullName: lead.fullName,
    registration: lead.registration,
    make: lead.make,
    model: lead.model,
    year: lead.year,
    mileage: lead.mileage,
    category: lead.category,
    contactPreference: lead.contactPreference,
    postcode: lead.postcode,
    phone: lead.phone,
    email: lead.email,
    condition: lead.condition,
    finance: lead.finance,
    channel: lead.channel,
    utmCampaign: lead.utmCampaign,
  };
}

function tokenise(text: string) {
  return text
    .split(`\n\nConditions: ${SENTINEL_CONDITIONS}`)
    .join("{{conditions}}")
    .split(SENTINEL_CONDITIONS)
    .join("")
    .split(gbp(SENTINEL_PENCE))
    .join("{{amount}}")
    .split(ukDate(SENTINEL_DATE))
    .join("{{validUntil}}");
}

export function offerPreviewTemplate(lead: Lead): OfferPreviewTemplate {
  const data = leadForEmail(lead);
  const quote = { amountPence: SENTINEL_PENCE, validUntil: SENTINEL_DATE, conditions: SENTINEL_CONDITIONS, version: 1 };
  const mail = sellerOfferEmail(data, quote, `${site.url}/offer/${LINK_TOKEN}`);
  const wa = whatsappOffer(data, quote, LINK_TOKEN);
  return { subject: tokenise(mail.subject), emailText: tokenise(mail.text), whatsapp: tokenise(wa.preview), whatsappTemplate: wa.template };
}

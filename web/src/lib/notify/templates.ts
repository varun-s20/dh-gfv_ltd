import "server-only";

import { site } from "@/lib/site";
import { formatReg } from "@/lib/vehicles";

/**
 * Transactional email templates. Table layout + inline styles so they render in
 * Outlook, Gmail and Apple Mail; every email also has a plain-text part.
 */

const C = {
  head: "#0a0a0a",
  onHead: "#f5f5f2",
  page: "#efefeb",
  card: "#ffffff",
  note: "#f6f6f2",
  ink: "#0b0b0c",
  muted: "#5d5d58",
  gold: "#dfac29",
  goldDeep: "#8a640d",
  plate: "#f2c230",
  line: "#e4e4df",
};

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(pence / 100);

export const ukDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(date);

type Layout = { preheader: string; title: string; body: string };

function layout({ preheader, title, body }: Layout) {
  const { company, contact, brand } = site;
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
<tr><td style="background:${C.head};padding:22px 32px;border-bottom:3px solid ${C.gold};">
<span style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:20px;color:${C.onHead};letter-spacing:-0.3px;">${esc(brand.name)}</span>
<span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.gold};padding-left:8px;">${esc(brand.descriptor)}</span>
</td></tr>
<tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${C.ink};">
${body}
</td></tr>
<tr><td style="padding:24px 32px 28px 32px;border-top:1px solid ${C.line};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${C.muted};">
Questions? Call ${esc(contact.phoneDisplay)} or reply on WhatsApp. ${contact.email ? `Email ${esc(contact.email)}.` : ""}<br>
${esc(company.legalName)}. Registered in ${esc(company.registeredIn)}, company number ${esc(company.companyNumber)}. Registered office: ${esc(company.registeredOffice)}.
</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (text: string) =>
  `<h1 style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:26px;line-height:32px;letter-spacing:-0.4px;color:${C.ink};">${text}</h1>`;
const p = (text: string) => `<p style="margin:0 0 16px 0;">${text}</p>`;
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;"><tr><td style="background:${C.gold};border-radius:999px;">
<a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${C.ink};text-decoration:none;">${esc(label)}</a></td></tr></table>`;

function rows(items: Array<[string, string | number | null | undefined]>) {
  const cells = items
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:13px;width:44%;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:14px;">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">${cells}</table>`;
}

const plate = (reg: string) =>
  `<span style="display:inline-block;background:${C.plate};border:2px solid ${C.ink};border-radius:5px;padding:3px 10px;font-family:'Arial Narrow',Arial,sans-serif;font-weight:bold;font-size:16px;letter-spacing:1.5px;color:${C.ink};">${esc(formatReg(reg))}</span>`;

export type LeadForEmail = {
  ref: string;
  fullName: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  category: string;
  contactPreference: string;
  postcode?: string;
  phone?: string;
  email?: string;
  condition?: string;
  finance?: string;
  photoCount?: number;
  channel?: string;
  utmCampaign?: string | null;
};

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;
const vehicleName = (l: LeadForEmail) => `${l.year} ${l.make} ${l.model}`;
const prefLabel: Record<string, string> = { whatsapp: "WhatsApp", email: "email", phone: "a phone call" };

/* ---------------------------------------------------------------- seller: received */

export function sellerReceivedEmail(lead: LeadForEmail) {
  const subject = `We've got your ${lead.make} ${lead.model} — ref ${lead.ref}`;
  const body = [
    h1(`Thanks, ${esc(firstName(lead.fullName))}. A specialist is on it.`),
    p(`We've received the details of your ${esc(vehicleName(lead))} ${plate(lead.registration)}`),
    p(
      `A member of our team will look through your answers and photos and send you a firm offer by ${esc(prefLabel[lead.contactPreference] ?? "email")}, usually ${esc(site.promises.quoteTurnaround)}.`,
    ),
    rows([
      ["Your reference", lead.ref],
      ["Vehicle", vehicleName(lead)],
      ["Mileage", `${lead.mileage.toLocaleString("en-GB")} miles`],
    ]),
    `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;">What happens next</p>`,
    `<ol style="margin:0 0 20px 18px;padding:0;">
<li style="margin-bottom:6px;">We review your vehicle and check the market for your exact spec.</li>
<li style="margin-bottom:6px;">You get one firm offer in writing, valid for ${site.promises.offerValidDays} days.</li>
<li style="margin-bottom:6px;">If you accept, we arrange collection and ${site.promises.paidBeforeCollection ? "pay you before we take the keys" : "pay you on collection"}.</li>
</ol>`,
    p(`Nothing is binding until you accept. If anything changes about the vehicle, just reply to this email.`),
  ].join("");
  const text = `Thanks, ${firstName(lead.fullName)}. We've received the details of your ${vehicleName(lead)} (${formatReg(lead.registration)}). Your reference is ${lead.ref}. A specialist will send you a firm offer by ${prefLabel[lead.contactPreference] ?? "email"}, usually ${site.promises.quoteTurnaround}.`;
  return { subject, html: layout({ preheader: `Your reference is ${lead.ref}`, title: subject, body }), text };
}

/* ---------------------------------------------------------------- admin: new lead */

export function adminNewLeadEmail(lead: LeadForEmail, adminUrl: string) {
  const subject = `New ${lead.category === "tesla" ? "Tesla" : lead.category === "van" ? "van" : "EV"} lead: ${vehicleName(lead)} · ${lead.ref}`;
  const body = [
    h1(`New lead: ${esc(vehicleName(lead))}`),
    p(`${plate(lead.registration)} &nbsp; from ${esc(lead.fullName)}${lead.postcode ? `, ${esc(lead.postcode)}` : ""}`),
    rows([
      ["Reference", lead.ref],
      ["Mileage", `${lead.mileage.toLocaleString("en-GB")} miles`],
      ["Condition", lead.condition],
      ["Finance", lead.finance],
      ["Photos", lead.photoCount ?? 0],
      ["Prefers", prefLabel[lead.contactPreference] ?? lead.contactPreference],
      ["Phone", lead.phone],
      ["Email", lead.email],
      ["Source", [lead.channel, lead.utmCampaign].filter(Boolean).join(" · ")],
    ]),
    button(adminUrl, "Open the lead"),
  ].join("");
  const text = `New lead ${lead.ref}: ${vehicleName(lead)} (${formatReg(lead.registration)}), ${lead.mileage} miles, from ${lead.fullName}. Open: ${adminUrl}`;
  return { subject, html: layout({ preheader: `${lead.fullName} · ${lead.postcode ?? ""}`, title: subject, body }), text };
}

/* ---------------------------------------------------------------- seller: offer */

export type QuoteForEmail = { amountPence: number; validUntil: Date; conditions?: string | null; version: number };

export function sellerOfferEmail(lead: LeadForEmail, quote: QuoteForEmail, offerUrl: string) {
  const amount = gbp(quote.amountPence);
  const subject = `Your offer for the ${lead.make} ${lead.model}: ${amount}`;
  const body = [
    h1(`We'd like to buy your ${esc(lead.make)} ${esc(lead.model)} for <span style="color:${C.goldDeep};">${esc(amount)}</span>`),
    p(`${plate(lead.registration)} &nbsp; ${esc(vehicleName(lead))}, ${lead.mileage.toLocaleString("en-GB")} miles`),
    p(
      `This is a firm offer based on the details and photos you sent. It's valid until <strong>${esc(ukDate(quote.validUntil))}</strong>.${site.promises.noFees ? " There are no fees to pay." : ""}`,
    ),
    quote.conditions ? `<div style="background:${C.note};border-left:3px solid ${C.gold};padding:12px 16px;margin:0 0 20px 0;font-size:14px;">${esc(quote.conditions).replace(/\n/g, "<br>")}</div>` : "",
    button(offerUrl, "View and accept your offer"),
    p(`Prefer to talk it through? Reply to this email or message us on WhatsApp quoting ${esc(lead.ref)}.`),
  ].join("");
  const text = `Your offer for the ${vehicleName(lead)} (${formatReg(lead.registration)}) is ${amount}, valid until ${ukDate(quote.validUntil)}. View and accept: ${offerUrl}${quote.conditions ? `\n\nConditions: ${quote.conditions}` : ""}`;
  return { subject, html: layout({ preheader: `${amount} · valid until ${ukDate(quote.validUntil)}`, title: subject, body }), text };
}

/* ---------------------------------------------------------------- offer responses */

export function sellerAcceptedEmail(lead: LeadForEmail, quote: QuoteForEmail) {
  const amount = gbp(quote.amountPence);
  const subject = `Offer accepted: ${amount} for your ${lead.make} ${lead.model}`;
  const body = [
    h1(`Great — it's agreed at ${esc(amount)}.`),
    p(`Thanks, ${esc(firstName(lead.fullName))}. We'll be in touch shortly to arrange collection at a time that suits you.`),
    `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;">Please have ready</p>`,
    `<ul style="margin:0 0 20px 18px;padding:0;">
<li style="margin-bottom:6px;">The V5C logbook in your name</li>
<li style="margin-bottom:6px;">All keys or key cards, and any charging cables</li>
<li style="margin-bottom:6px;">Photo ID and a recent bank statement for payment</li>
${lead.category === "tesla" ? `<li style="margin-bottom:6px;">Remove the car from your Tesla account after payment (we'll talk you through it)</li>` : ""}
</ul>`,
    p(`Your reference is ${esc(lead.ref)}.`),
  ].join("");
  const text = `Offer accepted at ${amount}. We'll contact you to arrange collection. Please have the V5C, all keys/cards, charging cables, photo ID and a recent bank statement ready. Ref ${lead.ref}.`;
  return { subject, html: layout({ preheader: `Reference ${lead.ref}`, title: subject, body }), text };
}

export function adminOfferResponseEmail(lead: LeadForEmail, quote: QuoteForEmail, accepted: boolean, adminUrl: string, reason?: string | null) {
  const amount = gbp(quote.amountPence);
  const subject = `${accepted ? "Offer accepted" : "Offer declined"}: ${vehicleName(lead)} · ${amount} · ${lead.ref}`;
  const body = [
    h1(accepted ? `${esc(firstName(lead.fullName))} accepted ${esc(amount)}` : `${esc(firstName(lead.fullName))} declined ${esc(amount)}`),
    p(`${plate(lead.registration)} &nbsp; ${esc(vehicleName(lead))}`),
    reason ? p(`Reason given: “${esc(reason)}”`) : "",
    p(accepted ? "Call them to arrange collection and payment." : "Consider a follow-up call if there's room to move."),
    button(adminUrl, "Open the lead"),
  ].join("");
  const text = `${lead.fullName} ${accepted ? "accepted" : "declined"} the ${amount} offer for ${vehicleName(lead)} (${lead.ref}). ${reason ? `Reason: ${reason}. ` : ""}${adminUrl}`;
  return { subject, html: layout({ preheader: lead.ref, title: subject, body }), text };
}

/* ---------------------------------------------------------------- WhatsApp template bodies */

/**
 * Bodies mirror the templates to submit for Meta approval (docs/WHATSAPP_TEMPLATES.md).
 * Parameters are positional: {{1}}, {{2}}…
 */
export function whatsappReceived(lead: LeadForEmail) {
  const body = [firstName(lead.fullName), `${lead.make} ${lead.model}`, lead.ref, site.promises.quoteTurnaround];
  const preview = `Hi ${body[0]}, thanks for sending us your ${body[1]}. Your reference is ${body[2]}. A specialist will reply here with your offer, usually ${body[3]}.`;
  return { template: process.env.WHATSAPP_TEMPLATE_RECEIVED ?? "quote_received", body, preview };
}

export function whatsappOffer(lead: LeadForEmail, quote: QuoteForEmail, token: string) {
  const body = [
    firstName(lead.fullName),
    `${lead.make} ${lead.model}`,
    formatReg(lead.registration),
    gbp(quote.amountPence),
    ukDate(quote.validUntil),
  ];
  const preview = `Hi ${body[0]}, your offer for the ${body[1]} (${body[2]}) is ${body[3]}. It's valid until ${body[4]}. View and accept: ${site.url}/offer/${token}`;
  return { template: process.env.WHATSAPP_TEMPLATE_OFFER ?? "quote_offer", body, preview, urlButtonSuffix: token };
}

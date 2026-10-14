import "server-only";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { Lead, Quote } from "@/lib/db/schema";
import { addEvent } from "@/lib/leads/service";
import { site } from "@/lib/site";
import { sendEmail, sendWhatsAppTemplate, type SendResult } from "./providers";
import {
  adminNewLeadEmail,
  adminOfferResponseEmail,
  sellerAcceptedEmail,
  sellerOfferEmail,
  sellerReceivedEmail,
  whatsappOffer,
  whatsappReceived,
  type LeadForEmail,
} from "./templates";

type Actor = { id?: string; name?: string };

const adminLeadUrl = (id: string) => `${site.url}/admin/leads/${id}`;
const offerUrl = (token: string) => `${site.url}/offer/${token}`;

function toEmailLead(lead: Lead, photoCount?: number): LeadForEmail {
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
    photoCount,
    channel: lead.channel,
    utmCampaign: lead.utmCampaign,
  };
}

/** Who gets new-lead alerts: the admin setting first, then ADMIN_NOTIFY_EMAILS. */
export async function adminRecipients(): Promise<string[]> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "notify.emails"));
  const fromSettings = Array.isArray(row?.value) ? (row!.value as string[]) : [];
  const fromEnv = (process.env.ADMIN_NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...fromSettings, ...fromEnv])];
}

async function record(
  params: {
    leadId: string;
    quoteId?: string;
    channel: "email" | "whatsapp";
    recipient: string;
    template: string;
    subject?: string;
    preview: string;
  },
  result: SendResult,
  actor: Actor = {},
) {
  const db = await getDb();
  const status = result.ok ? (result.simulated ? "simulated" : "sent") : "failed";
  const [message] = await db
    .insert(schema.messages)
    .values({
      leadId: params.leadId,
      quoteId: params.quoteId,
      channel: params.channel,
      recipient: params.recipient,
      template: params.template,
      subject: params.subject,
      preview: params.preview.slice(0, 600),
      providerId: result.ok ? result.providerId : null,
      status,
      error: result.ok ? null : result.error,
    })
    .returning({ id: schema.messages.id });
  await addEvent(db, params.leadId, "message", { kind: "message", messageId: message!.id, channel: params.channel, status: `${params.template}: ${status}` }, actor);
  return status;
}

/** After a seller submits: confirmation to them, alert to the team. Never throws. */
export async function notifyLeadReceived(leadId: string, photoCount: number) {
  try {
    const db = await getDb();
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId));
    if (!lead) return;
    const data = toEmailLead(lead, photoCount);
    const jobs: Promise<unknown>[] = [];

    const seller = sellerReceivedEmail(data);
    jobs.push(
      sendEmail({ to: lead.email, subject: seller.subject, html: seller.html, text: seller.text, tag: "lead-received", replyTo: site.contact.email }).then((r) =>
        record({ leadId, channel: "email", recipient: lead.email, template: "lead-received", subject: seller.subject, preview: seller.text }, r),
      ),
    );

    if (lead.contactPreference === "whatsapp") {
      const wa = whatsappReceived(data);
      jobs.push(
        sendWhatsAppTemplate({ to: lead.phone, template: wa.template, body: wa.body, preview: wa.preview }).then((r) =>
          record({ leadId, channel: "whatsapp", recipient: lead.phone, template: wa.template, preview: wa.preview }, r),
        ),
      );
    }

    const recipients = await adminRecipients();
    if (recipients.length) {
      const alert = adminNewLeadEmail(data, adminLeadUrl(leadId));
      jobs.push(
        sendEmail({ to: recipients, subject: alert.subject, html: alert.html, text: alert.text, tag: "admin-new-lead", replyTo: lead.email }).then((r) =>
          record({ leadId, channel: "email", recipient: recipients.join(", "), template: "admin-new-lead", subject: alert.subject, preview: alert.text }, r),
        ),
      );
    }
    await Promise.allSettled(jobs);
  } catch (error) {
    console.error("[notify] lead received failed", error);
  }
}

/** Send an offer by the chosen channels. Returns per-channel outcome for the UI. */
export async function deliverOffer(lead: Lead, quote: Quote, token: string, channels: Array<"email" | "whatsapp">, actor: Actor) {
  const data = toEmailLead(lead);
  const outcome: Record<string, string> = {};
  const jobs: Promise<void>[] = [];
  if (channels.includes("email")) {
    const mail = sellerOfferEmail(data, quote, offerUrl(token));
    jobs.push(
      sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text, tag: "quote-offer", replyTo: site.contact.email })
        .then((r) => record({ leadId: lead.id, quoteId: quote.id, channel: "email", recipient: lead.email, template: "quote-offer", subject: mail.subject, preview: mail.text }, r, actor))
        .then((s) => void (outcome.email = s)),
    );
  }
  if (channels.includes("whatsapp")) {
    const wa = whatsappOffer(data, quote, token);
    jobs.push(
      sendWhatsAppTemplate({ to: lead.phone, template: wa.template, body: wa.body, urlButtonSuffix: wa.urlButtonSuffix, preview: wa.preview })
        .then((r) => record({ leadId: lead.id, quoteId: quote.id, channel: "whatsapp", recipient: lead.phone, template: wa.template, preview: wa.preview }, r, actor))
        .then((s) => void (outcome.whatsapp = s)),
    );
  }
  await Promise.allSettled(jobs);
  return outcome;
}

/** Seller accepted or declined on the offer page. */
export async function notifyOfferResponse(lead: Lead, quote: Quote, accepted: boolean, reason?: string | null) {
  try {
    const data = toEmailLead(lead);
    const jobs: Promise<unknown>[] = [];
    if (accepted) {
      const mail = sellerAcceptedEmail(data, quote);
      jobs.push(
        sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text, tag: "offer-accepted", replyTo: site.contact.email }).then((r) =>
          record({ leadId: lead.id, quoteId: quote.id, channel: "email", recipient: lead.email, template: "offer-accepted", subject: mail.subject, preview: mail.text }, r),
        ),
      );
    }
    const recipients = await adminRecipients();
    if (recipients.length) {
      const alert = adminOfferResponseEmail(data, quote, accepted, adminLeadUrl(lead.id), reason);
      jobs.push(
        sendEmail({ to: recipients, subject: alert.subject, html: alert.html, text: alert.text, tag: "admin-offer-response" }).then((r) =>
          record({ leadId: lead.id, quoteId: quote.id, channel: "email", recipient: recipients.join(", "), template: "admin-offer-response", subject: alert.subject, preview: alert.text }, r),
        ),
      );
    }
    await Promise.allSettled(jobs);
  } catch (error) {
    console.error("[notify] offer response failed", error);
  }
}

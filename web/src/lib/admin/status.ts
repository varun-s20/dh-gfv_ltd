/**
 * Labels and colour coding for lead/quote state, shared by server and client
 * components. Colours encode state consistently everywhere:
 * new = plate yellow, contacted = muted sky, quoted = brass, accepted = green,
 * rejected = signal red, closed = slate.
 */

export const LEAD_STATUSES = ["new", "contacted", "quoted", "accepted", "rejected", "closed"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

type Tone = { label: string; pill: string; dot: string; bar: string; description: string };

export const leadStatusMeta: Record<LeadStatusValue, Tone> = {
  new: {
    label: "New",
    pill: "bg-plate text-ink ring-ink/20",
    dot: "bg-ink",
    bar: "#e8bd00",
    description: "Waiting for a first reply",
  },
  contacted: {
    label: "Contacted",
    pill: "bg-[#e3edf5] text-[#1f4a6e] ring-[#1f4a6e]/15",
    dot: "bg-[#4a7aa3]",
    bar: "#6b93b8",
    description: "We've been in touch",
  },
  quoted: {
    label: "Quoted",
    pill: "bg-[#f3e6cf] text-brass-deep ring-brass-deep/20",
    dot: "bg-brass",
    bar: "#c9a26b",
    description: "Offer sent, waiting on the seller",
  },
  accepted: {
    label: "Accepted",
    pill: "bg-ok-soft text-ok ring-ok/20",
    dot: "bg-ok",
    bar: "#1c6b45",
    description: "Seller said yes; arrange collection",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-signal-soft text-signal ring-signal/20",
    dot: "bg-signal",
    bar: "#b42318",
    description: "Seller declined or we passed",
  },
  closed: {
    label: "Closed",
    pill: "bg-[#e7e9e6] text-slate ring-slate/20",
    dot: "bg-slate",
    bar: "#4f5b56",
    description: "Finished",
  },
};

export const QUOTE_STATUSES = ["draft", "sent", "viewed", "accepted", "declined", "expired", "superseded"] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUSES)[number];

export const quoteStatusMeta: Record<QuoteStatusValue, { label: string; pill: string }> = {
  draft: { label: "Draft", pill: "bg-bone text-slate ring-slate/35" },
  sent: { label: "Sent", pill: "bg-[#e3edf5] text-[#1f4a6e] ring-[#1f4a6e]/15" },
  viewed: { label: "Viewed", pill: "bg-[#f3e6cf] text-brass-deep ring-brass-deep/20" },
  accepted: { label: "Accepted", pill: "bg-ok-soft text-ok ring-ok/20" },
  declined: { label: "Declined", pill: "bg-signal-soft text-signal ring-signal/20" },
  expired: { label: "Expired", pill: "bg-amber-soft text-amber ring-amber/20" },
  superseded: { label: "Superseded", pill: "bg-ink/[0.04] text-slate/80 ring-ink/10" },
};

/** Offers past their date still show "sent"/"viewed" in the database until someone opens them; show the truth. */
export function effectiveQuoteStatus(status: QuoteStatusValue, validUntil: Date, now: Date): QuoteStatusValue {
  return (status === "sent" || status === "viewed") && validUntil.getTime() < now.getTime() ? "expired" : status;
}

export const messageStatusMeta: Record<string, { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "text-slate" },
  simulated: { label: "Simulated", tone: "text-amber" },
  sent: { label: "Sent", tone: "text-slate" },
  delivered: { label: "Delivered", tone: "text-ok" },
  read: { label: "Read", tone: "text-ok" },
  failed: { label: "Failed", tone: "text-signal" },
};

const CHANNELS: Record<string, string> = {
  "google-ads": "Google Ads",
  "bing-ads": "Microsoft Ads",
  organic: "Organic search",
  direct: "Direct",
  referral: "Referral",
  social: "Social",
  email: "Email",
};
export const channelLabel = (channel: string) => CHANNELS[channel] ?? channel;

export const contactLabel: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", phone: "Phone" };

export const categoryShort: Record<string, string> = { tesla: "Tesla", ev: "EV", van: "Van" };

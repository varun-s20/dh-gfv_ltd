import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------------------------------------------- enums */

export const leadStatus = pgEnum("lead_status", ["new", "contacted", "quoted", "accepted", "rejected", "closed"]);
export const vehicleCategory = pgEnum("vehicle_category", ["tesla", "ev", "van"]);
export const conditionGrade = pgEnum("condition_grade", ["excellent", "good", "fair", "poor"]);
export const damageLevel = pgEnum("damage_level", ["none", "minor", "major"]);
export const writeOffStatus = pgEnum("write_off_status", ["no", "cat-n", "cat-s", "unsure"]);
export const serviceHistory = pgEnum("service_history", ["full", "part", "none", "unsure"]);
export const financeType = pgEnum("finance_type", ["none", "pcp", "hp", "lease", "unsure"]);
export const sellerType = pgEnum("seller_type", ["private", "business"]);
export const sellIntent = pgEnum("sell_intent", ["sell", "part-exchange", "commission"]);
export const contactPreference = pgEnum("contact_preference", ["whatsapp", "email", "phone"]);
export const quoteStatus = pgEnum("quote_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "superseded",
]);
export const messageChannel = pgEnum("message_channel", ["email", "whatsapp"]);
export const messageStatus = pgEnum("message_status", ["queued", "sent", "delivered", "read", "failed", "simulated"]);
export const adminRole = pgEnum("admin_role", ["owner", "staff"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------------------------------------------------------------- leads */

export type LeadExtras = {
  /** Tesla software: bought outright, subscription, not fitted, or unsure. */
  fsd?: "bought" | "subscription" | "none" | "unsure";
  eap?: "bought" | "none" | "unsure";
  accelerationBoost?: boolean;
  /** Charging equipment handed over with the vehicle. */
  cables?: Array<"type2" | "granny" | "chademo" | "none">;
  /** Renault Zoe / Kangoo battery hire. */
  batteryLeased?: boolean;
  /** Vans: racking, livery, conversions. */
  vanFeatures?: Array<"racking" | "livery" | "tow-bar" | "conversion">;
  vatQualifying?: boolean;
  vehicleCount?: number;
};

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-friendly reference quoted to the seller, e.g. GF-7K3Q9. */
    ref: text("ref").notNull(),
    status: leadStatus("status").notNull().default("new"),
    category: vehicleCategory("category").notNull(),

    registration: text("registration").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    variant: text("variant"),
    year: integer("year").notNull(),
    mileage: integer("mileage").notNull(),
    colour: text("colour"),

    condition: conditionGrade("condition").notNull(),
    damage: damageLevel("damage").notNull().default("none"),
    damageDetails: text("damage_details"),
    writeOff: writeOffStatus("write_off").notNull().default("no"),
    warningLights: boolean("warning_lights").notNull().default(false),
    serviceHistory: serviceHistory("service_history").notNull().default("unsure"),
    /** Battery state of health in percent, when the seller knows it. */
    batteryHealth: integer("battery_health"),
    batteryHealthSource: text("battery_health_source"),
    keys: integer("keys"),

    finance: financeType("finance").notNull().default("none"),
    financeLender: text("finance_lender"),
    /** Approximate settlement figure in pence. */
    financeSettlementPence: integer("finance_settlement_pence"),
    isRegisteredKeeper: boolean("is_registered_keeper").notNull().default(true),

    sellerType: sellerType("seller_type").notNull().default("private"),
    businessName: text("business_name"),
    intent: sellIntent("intent").notNull().default("sell"),
    extras: jsonb("extras").$type<LeadExtras>().notNull().default({}),
    sellerNotes: text("seller_notes"),

    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    postcode: text("postcode").notNull(),
    contactPreference: contactPreference("contact_preference").notNull().default("whatsapp"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),

    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    gclid: text("gclid"),
    gbraid: text("gbraid"),
    wbraid: text("wbraid"),
    fbclid: text("fbclid"),
    landingPage: text("landing_page"),
    referrer: text("referrer"),
    /** Normalised channel derived from attribution: google-ads, organic, direct, referral, social, email. */
    channel: text("channel").notNull().default("direct"),
    /** Landing-page variant, kept for A/B tests later. */
    variantKey: text("variant_key"),

    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    privacyVersion: text("privacy_version").notNull(),

    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** Price actually paid, recorded when the deal completes (pence). */
    purchasePricePence: integer("purchase_price_pence"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("leads_ref_idx").on(t.ref),
    index("leads_status_idx").on(t.status),
    index("leads_category_idx").on(t.category),
    index("leads_created_idx").on(t.createdAt),
    index("leads_registration_idx").on(t.registration),
    index("leads_email_idx").on(t.email),
  ],
);

export const leadPhotos = pgTable(
  "lead_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    slot: text("slot"),
    contentType: text("content_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_photos_lead_idx").on(t.leadId)],
);

/** Uploaded but not yet attached to a lead; swept after 24 hours. */
export const pendingUploads = pgTable("pending_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeadEventData =
  | { kind: "status"; from: string; to: string }
  | { kind: "note"; body: string }
  | { kind: "quote"; quoteId: string; version: number; amountPence: number; action: string }
  | { kind: "message"; messageId: string; channel: string; status: string }
  | { kind: "system"; body: string };

export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name"),
    data: jsonb("data").$type<LeadEventData>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_events_lead_idx").on(t.leadId, t.createdAt)],
);

/* ---------------------------------------------------------------- quotes */

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    amountPence: integer("amount_pence").notNull(),
    currency: text("currency").notNull().default("GBP"),
    /** Seller-facing conditions printed on the offer. */
    conditions: text("conditions"),
    /** Team-only notes, never shown to the seller. */
    internalNotes: text("internal_notes"),
    status: quoteStatus("status").notNull().default("draft"),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    /** SHA-256 of the offer-page token; the raw token only lives in the link. */
    tokenHash: text("token_hash").notNull(),
    sentVia: text("sent_via").array().notNull().default(sql`ARRAY[]::text[]`),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    createdBy: uuid("created_by"),
    createdByName: text("created_by_name"),
    ...timestamps,
  },
  (t) => [
    index("quotes_lead_idx").on(t.leadId),
    uniqueIndex("quotes_lead_version_idx").on(t.leadId, t.version),
    uniqueIndex("quotes_token_idx").on(t.tokenHash),
  ],
);

/* ---------------------------------------------------------------- messages */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    channel: messageChannel("channel").notNull(),
    direction: text("direction").notNull().default("outbound"),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    subject: text("subject"),
    preview: text("preview"),
    providerId: text("provider_id"),
    status: messageStatus("status").notNull().default("queued"),
    error: text("error"),
    ...timestamps,
  },
  (t) => [index("messages_lead_idx").on(t.leadId), index("messages_provider_idx").on(t.providerId)],
);

/* ---------------------------------------------------------------- admin + auth */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRole("role").notNull().default("staff"),
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    disabled: boolean("disabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("admin_users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token held in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    /** False until the second factor is verified for users with TOTP. */
    mfaPassed: boolean("mfa_passed").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    target: text("target"),
    ipHash: text("ip_hash"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

/* ---------------------------------------------------------------- content + settings */

/** Admin-editable copy and imagery, keyed by block (e.g. "page.tesla.hero"). */
export const contentBlocks = pgTable("content_blocks", {
  key: text("key").primaryKey(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadPhoto = typeof leadPhotos.$inferSelect;
export type LeadEvent = typeof leadEvents.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type LeadStatus = (typeof leadStatus.enumValues)[number];
export type VehicleCategory = (typeof vehicleCategory.enumValues)[number];
export type QuoteStatus = (typeof quoteStatus.enumValues)[number];

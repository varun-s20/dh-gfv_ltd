import { z } from "zod";
import {
  FIRST_EV_YEAR,
  formatPostcode,
  isPlausibleReg,
  isUkPostcode,
  normaliseReg,
  toE164Uk,
} from "@/lib/vehicles";

/**
 * One schema for the browser and the server. The browser validates step by step
 * (see STEP_FIELDS); the Server Action re-validates the whole payload, so nothing
 * from the client is trusted.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters` })
    .optional()
    .transform((v) => (v ? v : undefined));

/** Whole-number text input → number, with friendly bounds. */
const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s£]/g, ""))
    .refine((v) => v !== "", { error: `Enter the ${label}` })
    .refine((v) => /^\d+$/.test(v), { error: `Enter the ${label} as a whole number` })
    .transform(Number)
    .refine((n) => n >= min && n <= max, { error: `Enter a ${label} between ${min.toLocaleString("en-GB")} and ${max.toLocaleString("en-GB")}` });

const optionalWholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s£%]/g, ""))
    .refine((v) => v === "" || /^\d+$/.test(v), { error: `Enter the ${label} as a whole number` })
    .transform((v) => (v === "" ? undefined : Number(v)))
    .refine((n) => n === undefined || (n >= min && n <= max), { error: `Enter a ${label} between ${min} and ${max}` })
    .optional();

/** Unanswered radios arrive as null or "" from the browser; treat them as not given. */
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(values).optional());

/** Required radios: null/"" become undefined so the custom message is shown. */
const requiredChoice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(values, { error: message }));

const checkboxList = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.enum(values)).max(values.length));

export const PHOTO_SLOTS = [
  { id: "front", label: "Front three-quarter", hint: "Stand at a front corner so we see the nose and one side." },
  { id: "rear", label: "Rear three-quarter", hint: "The opposite rear corner." },
  { id: "interior", label: "Front seats", hint: "Through the open driver's door." },
  { id: "dash", label: "Dashboard on", hint: "Mileage and battery range visible on the screen." },
  { id: "damage", label: "Any marks or damage", hint: "Close-ups help us price fairly, so we don't adjust later." },
] as const;

export const MAX_PHOTOS = 12;

export const photoSchema = z.object({
  id: z.uuid(),
  receipt: z.string().min(10).max(200),
  slot: z.string().max(20).optional(),
});

export const attributionSchema = z
  .object({
    utmSource: trimmed(255).optional(),
    utmMedium: trimmed(255).optional(),
    utmCampaign: trimmed(255).optional(),
    utmTerm: trimmed(255).optional(),
    utmContent: trimmed(255).optional(),
    gclid: trimmed(255).optional(),
    gbraid: trimmed(255).optional(),
    wbraid: trimmed(255).optional(),
    fbclid: trimmed(255).optional(),
    msclkid: trimmed(255).optional(),
    landingPage: trimmed(500).optional(),
    referrer: trimmed(500).optional(),
  })
  .partial()
  .optional();

export const quoteFields = z.object({
    /* Step 1 — vehicle */
    category: requiredChoice(["tesla", "ev", "van"] as const, "Choose what you're selling"),
    registration: z
      .string()
      .trim()
      .refine((v) => v !== "", { error: "Enter your registration" })
      .refine(isPlausibleReg, { error: "That doesn't look like a UK registration. Check the letters and numbers." })
      .transform(normaliseReg),
    make: z.string().trim().min(1, { error: "Choose the make" }).max(60),
    model: z.string().trim().min(1, { error: "Choose the model" }).max(80),
    modelOther: optionalText(80),
    variant: optionalText(80),
    year: wholeNumber("year", FIRST_EV_YEAR, new Date().getFullYear() + 1),
    mileage: wholeNumber("mileage", 0, 400_000),

    /* Step 2 — condition and battery */
    condition: requiredChoice(["excellent", "good", "fair", "poor"] as const, "Choose the overall condition"),
    damage: requiredChoice(["none", "minor", "major"] as const, "Tell us about any damage"),
    damageDetails: optionalText(1000),
    writeOff: requiredChoice(["no", "cat-n", "cat-s", "unsure"] as const, "Choose an answer"),
    warningLights: requiredChoice(["no", "yes"] as const, "Choose an answer"),
    serviceHistory: requiredChoice(["full", "part", "none", "unsure"] as const, "Choose an answer"),
    batteryHealth: optionalWholeNumber("battery health", 40, 100),
    batteryHealthSource: optionalChoice(["in-car", "certificate", "estimate"] as const),

    /* Step 3 — ownership, finance and extras */
    finance: requiredChoice(["none", "pcp", "hp", "lease", "unsure"] as const, "Choose an answer"),
    financeLender: optionalText(80),
    financeSettlement: optionalWholeNumber("settlement figure", 0, 500_000),
    isRegisteredKeeper: requiredChoice(["yes", "no"] as const, "Choose an answer"),
    keys: requiredChoice(["1", "2", "3"] as const, "How many keys or key cards?"),
    cables: checkboxList(["type2", "granny", "chademo", "none"] as const),
    intent: z.preprocess((v) => (v === "" || v === null || v === undefined ? "sell" : v), z.enum(["sell", "part-exchange", "commission"])),
    fsd: optionalChoice(["bought", "subscription", "none", "unsure"] as const),
    eap: optionalChoice(["bought", "none", "unsure"] as const),
    batteryLeased: optionalChoice(["yes", "no", "unsure"] as const),
    sellerType: z.preprocess((v) => (v === "" || v === null || v === undefined ? "private" : v), z.enum(["private", "business"])),
    businessName: optionalText(120),
    vatQualifying: optionalChoice(["yes", "no", "unsure"] as const),
    vehicleCount: optionalWholeNumber("number of vehicles", 1, 500),
    vanFeatures: checkboxList(["racking", "livery", "tow-bar", "conversion"] as const),

    /* Step 4 — photos (optional, strongly recommended) */
    photos: z.array(photoSchema).max(MAX_PHOTOS, { error: `Up to ${MAX_PHOTOS} photos` }).default([]),

    /* Step 5 — contact */
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Enter your name" })
      .max(120)
      .refine((v) => /\p{L}/u.test(v), { error: "Enter your name" }),
    email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter an email address like name@example.com" })),
    phone: z
      .string()
      .trim()
      .refine((v) => toE164Uk(v) !== null, { error: "Enter a UK mobile or landline number" })
      .transform((v) => toE164Uk(v)!),
    postcode: z
      .string()
      .trim()
      .refine(isUkPostcode, { error: "Enter a full UK postcode, like EN11 8TL" })
      .transform(formatPostcode),
    contactPreference: requiredChoice(["whatsapp", "email", "phone"] as const, "How should we send your offer?"),
    sellerNotes: optionalText(2000),
    marketingOptIn: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),

    /* Anti-abuse — honeypot must stay empty */
    website: z.string().max(0).optional().default(""),
    turnstileToken: z.string().max(4096).optional(),
    attribution: attributionSchema,
  });

type Partialish = Partial<z.output<typeof quoteFields>>;

/**
 * Cross-field rules. Written defensively so they also work on a single step's
 * subset of fields (zod skips object refinements while other fields are invalid,
 * so each step runs these explicitly).
 */
export function conditionalIssues(v: Partialish, ctx: z.RefinementCtx) {
    if ("model" in v && v.model === "Other" && !v.modelOther) {
      ctx.addIssue({ code: "custom", path: ["modelOther"], message: "Tell us the model" });
    }
    if (v.damage && v.damage !== "none" && !v.damageDetails) {
      ctx.addIssue({ code: "custom", path: ["damageDetails"], message: "Briefly describe the damage so we can price it" });
    }
    if ((v.finance === "pcp" || v.finance === "hp") && !v.financeLender) {
      ctx.addIssue({ code: "custom", path: ["financeLender"], message: "Who is the finance with?" });
    }
    if (v.sellerType === "business" && "businessName" in v && !v.businessName) {
      ctx.addIssue({ code: "custom", path: ["businessName"], message: "Enter the business name" });
    }
    if (v.batteryHealth !== undefined && "batteryHealthSource" in v && !v.batteryHealthSource) {
      ctx.addIssue({ code: "custom", path: ["batteryHealthSource"], message: "Where does this figure come from?" });
    }
}

export const quoteFormSchema = quoteFields.superRefine(conditionalIssues);

export type QuoteFormInput = z.input<typeof quoteFormSchema>;
export type QuoteFormValues = z.output<typeof quoteFormSchema>;

export const STEPS = [
  { id: "vehicle", title: "Your vehicle", short: "Vehicle" },
  { id: "condition", title: "Condition and battery", short: "Condition" },
  { id: "ownership", title: "Ownership and extras", short: "Ownership" },
  { id: "photos", title: "Photos", short: "Photos" },
  { id: "contact", title: "Where to send your offer", short: "Contact" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** Fields validated when leaving each step. */
export const STEP_FIELDS: Record<StepId, Array<keyof QuoteFormInput>> = {
  vehicle: ["category", "registration", "make", "model", "modelOther", "variant", "year", "mileage"],
  condition: ["condition", "damage", "damageDetails", "writeOff", "warningLights", "serviceHistory", "batteryHealth", "batteryHealthSource"],
  ownership: [
    "finance",
    "financeLender",
    "financeSettlement",
    "isRegisteredKeeper",
    "keys",
    "cables",
    "intent",
    "fsd",
    "eap",
    "batteryLeased",
    "sellerType",
    "businessName",
    "vatQualifying",
    "vehicleCount",
    "vanFeatures",
  ],
  photos: ["photos"],
  contact: ["fullName", "email", "phone", "postcode", "contactPreference", "sellerNotes", "marketingOptIn"],
};

export const PRIVACY_VERSION = "2026-10";

/** Per-step schemas used by the wizard when leaving a step. */
export const stepSchemas = Object.fromEntries(
  STEPS.map((step) => {
    const mask = Object.fromEntries(STEP_FIELDS[step.id].map((f) => [f, true])) as Record<string, true>;
    return [step.id, quoteFields.pick(mask as never).superRefine((v, ctx) => conditionalIssues(v as Partialish, ctx))];
  }),
) as unknown as Record<StepId, z.ZodType>;

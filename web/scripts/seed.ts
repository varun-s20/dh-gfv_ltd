/**
 * Demo data for LOCAL DEVELOPMENT ONLY.
 *   npm run db:seed            (stop `next dev` first: embedded PGlite allows one process at a time)
 *
 * Creates ~30 leads over the last 45 days across Teslas, electric cars and vans,
 * with quotes in every state, timeline events, messages and placeholder photos.
 * All people are obviously fake and use @example.com addresses and Ofcom's
 * drama phone range (07700 900xxx). Re-running replaces the previous demo data.
 *
 * Imports only the DB client, schema and storage: nothing that touches
 * next/headers or next/navigation at module load (see scripts/create-admin.ts).
 */
import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { eq, inArray, like, or } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";
import type { LeadEventData, NewLead } from "../src/lib/db/schema";
import { storage } from "../src/lib/storage";

/* ---------------------------------------------------------------- safety */

function assertLocal() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed: NODE_ENV is production.");
  const url = process.env.DATABASE_URL;
  if (url) {
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^\[|\]$/g, "");
    } catch {
      throw new Error("Refusing to seed: DATABASE_URL is not a valid URL.");
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
      throw new Error(`Refusing to seed: DATABASE_URL points at ${host}, which is not a local database.`);
    }
  }
}

/* ---------------------------------------------------------------- deterministic randomness */

let state = 20261013;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const chance = (p: number) => rand() < p;

/* ---------------------------------------------------------------- catalogue */

type Spec = { category: "tesla" | "ev" | "van"; make: string; model: string; variant: string; years: [number, number]; newPrice: number; colour: string[] };

const SPECS: Spec[] = [
  { category: "tesla", make: "Tesla", model: "Model 3", variant: "Long Range AWD", years: [2019, 2023], newPrice: 50_000, colour: ["Pearl White", "Midnight Silver", "Deep Blue"] },
  { category: "tesla", make: "Tesla", model: "Model 3", variant: "Performance", years: [2019, 2022], newPrice: 57_000, colour: ["Red Multi-Coat", "Solid Black"] },
  { category: "tesla", make: "Tesla", model: "Model Y", variant: "Long Range", years: [2022, 2024], newPrice: 54_000, colour: ["Pearl White", "Quicksilver"] },
  { category: "tesla", make: "Tesla", model: "Model Y", variant: "Performance", years: [2022, 2024], newPrice: 60_000, colour: ["Midnight Silver", "Ultra Red"] },
  { category: "tesla", make: "Tesla", model: "Model S", variant: "Long Range", years: [2017, 2021], newPrice: 85_000, colour: ["Solid Black", "Deep Blue"] },
  { category: "tesla", make: "Tesla", model: "Model X", variant: "100D", years: [2017, 2020], newPrice: 95_000, colour: ["Pearl White"] },
  { category: "ev", make: "MG", model: "MG4", variant: "Trophy Long Range", years: [2022, 2024], newPrice: 36_000, colour: ["Volcano Orange", "Holborn Blue"] },
  { category: "ev", make: "Volkswagen", model: "ID.3", variant: "Pro S", years: [2020, 2023], newPrice: 40_000, colour: ["Moonstone Grey", "Makena Turquoise"] },
  { category: "ev", make: "Kia", model: "EV6", variant: "GT-Line", years: [2021, 2023], newPrice: 48_000, colour: ["Runway Red", "Snow White Pearl"] },
  { category: "ev", make: "Hyundai", model: "Ioniq 5", variant: "Ultimate 73 kWh", years: [2021, 2023], newPrice: 49_000, colour: ["Gravity Gold", "Digital Teal"] },
  { category: "ev", make: "Nissan", model: "Leaf", variant: "N-Connecta 40 kWh", years: [2018, 2021], newPrice: 31_000, colour: ["Magnetic Blue", "Pearl White"] },
  { category: "ev", make: "Renault", model: "Zoe", variant: "GT Line R135", years: [2019, 2021], newPrice: 31_000, colour: ["Flame Red", "Celadon Blue"] },
  { category: "ev", make: "Polestar", model: "2", variant: "Long Range Dual Motor", years: [2021, 2023], newPrice: 50_000, colour: ["Thunder", "Snow"] },
  { category: "ev", make: "Fiat", model: "500e", variant: "La Prima", years: [2021, 2023], newPrice: 30_000, colour: ["Ocean Green", "Onyx Black"] },
  { category: "ev", make: "BMW", model: "i3", variant: "120Ah", years: [2018, 2021], newPrice: 36_000, colour: ["Capparis White", "Fluid Black"] },
  { category: "van", make: "Ford", model: "E-Transit", variant: "350 L3 H2 Trend", years: [2022, 2024], newPrice: 58_000, colour: ["Frozen White"] },
  { category: "van", make: "Nissan", model: "e-NV200", variant: "Acenta 40 kWh", years: [2018, 2021], newPrice: 30_000, colour: ["Solid White"] },
  { category: "van", make: "Vauxhall", model: "Vivaro Electric", variant: "Dynamic L2 75 kWh", years: [2021, 2023], newPrice: 42_000, colour: ["Summit White"] },
  { category: "van", make: "Toyota", model: "Proace Electric", variant: "Icon L1", years: [2021, 2023], newPrice: 44_000, colour: ["Pure White", "Grey"] },
  { category: "van", make: "Maxus", model: "eDeliver 3", variant: "LWB 52.5 kWh", years: [2021, 2023], newPrice: 34_000, colour: ["White"] },
];

const FIRST = ["Ada", "Benny", "Cara", "Dev", "Edna", "Felix", "Gina", "Hal", "Iris", "Jonty", "Kit", "Lola", "Milo", "Nell", "Otto", "Pippa", "Quin", "Rosa", "Sid", "Tess", "Umar", "Vera", "Wes", "Xena", "Yusuf", "Zara", "Arlo", "Bea", "Cyril", "Dot"];
const LAST = ["Testworth", "Placeholder", "Sample", "Example", "Demo", "Mockingbird", "Fakename", "Seedling", "Dummy", "Lorem", "Ipsum", "Stub", "Fixture", "Prototype", "Specimen"];
const POSTCODES = ["EN11 8TL", "SG14 1AB", "AL1 3XY", "CM20 2QS", "N1 9GU", "LU1 2HN", "WD17 1JJ", "SG1 1EH", "HP1 1BB", "EN8 7AA", "RM1 3BD", "CB1 2JD"];
const BUSINESSES = ["Example Plumbing Ltd", "Demo Deliveries Ltd", "Sample Sparks & Co", "Placeholder Couriers"];
const NOTES_SELLER = [
  "Small kerb mark on the front left wheel. Otherwise very tidy.",
  "Garaged, one owner from new. Both key cards and the mobile connector included.",
  "Would like to sell within two weeks if possible.",
  "Tyres replaced last month. Happy to send more photos.",
  "",
  "",
];
const TEAM_NOTES = [
  "Called, no answer. Left a voicemail and sent a WhatsApp.",
  "Seller confirmed the battery test result by phone: 91%.",
  "Settlement figure requested from the lender.",
  "Checked comparable cars on Auto Trader; priced at the top of trade.",
  "Seller asked if we can collect on a Saturday. Said yes.",
];
const DECLINE = ["Got a higher offer from a dealer.", "Decided to keep the car for now.", "Hoping for nearer £2,000 more."];

const now = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const LETTERS = "ABCDEFGHJKLMNOPRSTUVWXY";
function registration(year: number) {
  const half = chance(0.5) ? year % 100 : (year % 100) + 50;
  const l = () => LETTERS[Math.floor(rand() * LETTERS.length)];
  return `${l()}${l()}${String(half).padStart(2, "0")}${l()}${l()}${l()}`;
}
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const reference = () => `GF-${Array.from({ length: 5 }, () => REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length)]).join("")}`;
const gclid = () => `Cj0KCQjw${randomBytes(48).toString("base64url")}`;
const wamid = () => `wamid.SEED${randomBytes(12).toString("hex").toUpperCase()}`;

function price(spec: Spec, year: number, mileage: number) {
  const age = new Date().getFullYear() - year;
  const value = spec.newPrice * Math.pow(0.84, age) - mileage * 0.06;
  return Math.max(4_000, Math.round(value / 250) * 250);
}

/* ---------------------------------------------------------------- placeholder photos (PNG) */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

type RGB = [number, number, number];
const COLOURS: Record<string, RGB> = {
  white: [232, 230, 224],
  black: [28, 30, 32],
  silver: [150, 156, 160],
  blue: [38, 72, 130],
  red: [160, 34, 30],
  orange: [214, 110, 40],
  green: [44, 98, 86],
  grey: [110, 114, 116],
  teal: [30, 120, 128],
  gold: [170, 140, 80],
};
function colourFor(name: string): RGB {
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(COLOURS)) if (n.includes(k)) return v;
  if (/pearl|snow|frozen|summit|pure|capparis|solid white/.test(n)) return COLOURS.white!;
  if (/midnight|thunder|onyx|fluid/.test(n)) return COLOURS.black!;
  if (/quicksilver|moonstone|magnetic/.test(n)) return COLOURS.silver!;
  return COLOURS.grey!;
}

/** A simple studio-style car silhouette so the gallery looks like a gallery. */
function photo(slot: string, body: RGB, w = 720, h = 480): Buffer {
  const indoor = slot === "interior" || slot === "dash";
  const sky: RGB = indoor ? [52, 46, 40] : slot === "rear" ? [196, 206, 214] : [214, 222, 226];
  const floor: RGB = indoor ? [30, 26, 24] : [120, 124, 120];
  const mirror = slot === "rear";
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const horizon = Math.round(h * 0.68);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x0 = 0; x0 < w; x0++) {
      const x = mirror ? w - 1 - x0 : x0;
      let c: RGB;
      if (y < horizon) {
        const t = y / horizon;
        c = [sky[0] - 30 * t, sky[1] - 30 * t, sky[2] - 26 * t];
      } else {
        const t = (y - horizon) / (h - horizon);
        c = [floor[0] - 40 * t, floor[1] - 40 * t, floor[2] - 40 * t];
      }
      if (!indoor) {
        // body
        const bx0 = w * 0.14, bx1 = w * 0.86, by0 = h * 0.46, by1 = h * 0.7;
        const inBody = x > bx0 && x < bx1 && y > by0 && y < by1 && !(x < bx0 + 30 && y < by0 + 30 && (x - bx0 - 30) ** 2 + (y - by0 - 30) ** 2 > 900);
        // cabin (trapezoid)
        const cy0 = h * 0.3;
        const left = w * 0.3 + ((by0 - y) / (by0 - cy0)) * w * 0.05;
        const right = w * 0.72 - ((by0 - y) / (by0 - cy0)) * w * 0.12;
        const inCabin = y >= cy0 && y <= by0 && x > left && x < right;
        if (inBody) {
          const shade = 1 - (y - by0) / (by1 - by0) * 0.35;
          c = [body[0] * shade, body[1] * shade, body[2] * shade];
        } else if (inCabin) {
          c = [40 + (y - cy0) * 0.2, 52 + (y - cy0) * 0.2, 60 + (y - cy0) * 0.2];
        }
        for (const wx of [w * 0.28, w * 0.72]) {
          const d = (x - wx) ** 2 + (y - h * 0.7) ** 2;
          if (d < (h * 0.085) ** 2) c = d < (h * 0.045) ** 2 ? [150, 152, 150] : [22, 22, 24];
        }
        if (slot === "damage" && (x - w * 0.22) ** 2 + (y - h * 0.6) ** 2 < 260) c = [70, 64, 60];
      } else {
        // dashboard: a bright screen rectangle; interior: two seat shapes
        if (slot === "dash" && x > w * 0.32 && x < w * 0.68 && y > h * 0.28 && y < h * 0.56) c = [26, 30, 34];
        if (slot === "dash" && x > w * 0.34 && x < w * 0.66 && y > h * 0.3 && y < h * 0.54) c = [200, 210, 220];
        if (slot === "interior") {
          for (const sx of [w * 0.33, w * 0.67]) {
            if (Math.abs(x - sx) < w * 0.11 && y > h * 0.25 && y < h * 0.85) c = [70, 64, 58];
          }
        }
      }
      const i = row + 1 + x0 * 3;
      raw[i] = Math.max(0, Math.min(255, c[0]));
      raw[i + 1] = Math.max(0, Math.min(255, c[1]));
      raw[i + 2] = Math.max(0, Math.min(255, c[2]));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------------------------------------------------------------- main */

type Plan = "new" | "contacted" | "draft" | "quoted" | "viewed" | "expired" | "accepted" | "rejected" | "closed" | "closed-lost";

async function main() {
  assertLocal();
  const db = await getDb();

  // Remove previous demo data (only @example.com sellers) and its photos.
  const old = await db.select({ id: schema.leads.id }).from(schema.leads).where(like(schema.leads.email, "%@example.com"));
  if (old.length) {
    const ids = old.map((o) => o.id);
    const photos = await db.select({ key: schema.leadPhotos.storageKey }).from(schema.leadPhotos).where(inArray(schema.leadPhotos.leadId, ids));
    for (const p of photos) await storage().remove(p.key).catch(() => undefined);
    await db.delete(schema.messages).where(or(inArray(schema.messages.leadId, ids), like(schema.messages.recipient, "%@example.com%")));
    await db.delete(schema.leads).where(inArray(schema.leads.id, ids));
  }

  const [owner] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.role, "owner")).limit(1);
  const danny = { id: owner?.id ?? null, name: owner?.name ?? "Danny Pope" };

  // A demo staff member for the Team screen (random password, never printed).
  const staffEmail = "sam.demo@example.com";
  const [staff] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, staffEmail));
  if (!staff) {
    await db.insert(schema.adminUsers).values({ email: staffEmail, name: "Sam Demo", role: "staff", passwordHash: await hashPassword(randomBytes(18).toString("base64url")) });
  }

  // Ages in hours for 30 leads: a few fresh ones (some past the 2-hour mark), the rest spread over 45 days.
  const ages = [0.4, 1.2, 2.6, 3.4, 5.5, 9, 20, 26, 31, 44, 52, 70, 90, 110, 140, 170, 200, 240, 290, 330, 380, 430, 480, 540, 600, 680, 760, 850, 950, 1060];
  const plans: Plan[] = [
    "new", "new", "new", "new", "new", "contacted", "draft", "contacted", "quoted", "viewed",
    "quoted", "accepted", "contacted", "rejected", "viewed", "accepted", "closed", "quoted", "expired", "closed",
    "rejected", "accepted", "closed", "closed-lost", "closed", "expired", "rejected", "closed", "accepted", "closed",
  ];

  let photoTotal = 0;
  let quoteTotal = 0;
  let messageTotal = 0;

  for (let i = 0; i < ages.length; i++) {
    const plan = plans[i]!;
    // Lean the mix towards Teslas, like the real business.
    const spec = i % 5 === 3 ? pick(SPECS.filter((s) => s.category === "van")) : i % 2 === 0 ? pick(SPECS.filter((s) => s.category === "tesla")) : pick(SPECS.filter((s) => s.category === "ev"));
    const year = between(spec.years[0], spec.years[1]);
    const mileage = Math.round(between(8_000, spec.category === "van" ? 90_000 : 70_000) / 100) * 100;
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7) % LAST.length]!;
    const created = new Date(now - ages[i]! * HOUR - between(0, 40) * MIN);
    const pref = pick(["whatsapp", "whatsapp", "email", "phone"] as const);
    const business = spec.category === "van" && chance(0.7);
    const channelRoll = rand();
    const channel = channelRoll < 0.5 ? "google-ads" : channelRoll < 0.72 ? "organic" : channelRoll < 0.88 ? "direct" : "referral";
    const landing = spec.category === "tesla" ? "/sell-my-tesla" : spec.category === "van" ? "/sell-my-electric-van" : "/sell-my-electric-car";
    const value = price(spec, year, mileage);
    const finance = pick(["none", "none", "none", "pcp", "hp"] as const);

    const lead: NewLead = {
      ref: reference(),
      status: "new",
      category: spec.category,
      registration: registration(year),
      make: spec.make,
      model: spec.model,
      variant: spec.variant,
      year,
      mileage,
      colour: pick(spec.colour),
      condition: pick(["excellent", "good", "good", "fair"] as const),
      damage: pick(["none", "none", "minor"] as const),
      writeOff: "no",
      warningLights: chance(0.08),
      serviceHistory: pick(["full", "part", "full", "unsure"] as const),
      batteryHealth: chance(0.6) ? between(84, 98) : null,
      batteryHealthSource: chance(0.5) ? "in-car" : "certificate",
      keys: pick([1, 2, 2]),
      finance,
      financeLender: finance === "none" ? null : pick(["Tesla Financial Services", "Black Horse", "Close Brothers"]),
      financeSettlementPence: finance === "none" ? null : Math.round((value * 0.45) / 100) * 100 * 100,
      isRegisteredKeeper: !chance(0.05),
      sellerType: business ? "business" : "private",
      businessName: business ? pick(BUSINESSES) : null,
      intent: "sell",
      extras:
        spec.category === "tesla"
          ? { fsd: pick(["bought", "none", "subscription", "none"] as const), eap: pick(["bought", "none", "none"] as const), accelerationBoost: chance(0.2), cables: ["type2"] }
          : spec.category === "van"
            ? { vanFeatures: chance(0.5) ? ["racking"] : chance(0.5) ? ["livery", "tow-bar"] : [], vatQualifying: business ? true : undefined, vehicleCount: business && chance(0.4) ? between(2, 6) : undefined, cables: ["type2"] }
            : { cables: pick([["type2"], ["type2", "granny"], ["none"]] as const).slice(), batteryLeased: spec.model === "Zoe" ? chance(0.5) : undefined },
      sellerNotes: pick(NOTES_SELLER) || null,
      fullName: `${first} ${last}`,
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: `+447700900${String(100 + i * 23).slice(-3)}`,
      postcode: pick(POSTCODES),
      contactPreference: pref,
      marketingOptIn: chance(0.3),
      utmSource: channel === "google-ads" ? "google" : null,
      utmMedium: channel === "google-ads" ? "cpc" : null,
      utmCampaign: channel === "google-ads" ? `${spec.category}-core` : null,
      utmTerm: channel === "google-ads" ? pick(["sell my tesla", "sell electric car", "we buy any ev", "sell electric van"]) : null,
      gclid: channel === "google-ads" ? gclid() : null,
      landingPage: channel === "direct" ? "/" : landing,
      referrer: channel === "organic" ? "https://www.google.com/" : channel === "referral" ? pick(["https://www.speakev.com/", "https://teslaownersuk.com/forum"]) : null,
      channel,
      ipHash: null,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Seed/1.0",
      privacyVersion: "2026-10",
      createdAt: created,
      updatedAt: created,
    };

    const [inserted] = await db.insert(schema.leads).values(lead).returning({ id: schema.leads.id });
    const leadId = inserted!.id;

    const events: Array<{ leadId: string; type: string; data: LeadEventData; actorId?: string | null; actorName?: string | null; createdAt: Date }> = [];
    const msgs: Array<typeof schema.messages.$inferInsert> = [];
    const actor = { actorId: danny.id, actorName: danny.name };
    const seller = { actorId: null, actorName: `${lead.fullName} (seller)` };

    // Photos
    const slots = ["front", "rear", "interior", "dash", "damage"].slice(0, chance(0.85) ? between(3, 5) : 0);
    for (const [position, slot] of slots.entries()) {
      const key = `seed/${leadId}/${slot}.png`;
      const bytes = photo(slot, colourFor(lead.colour ?? "grey"));
      await storage().put(key, new Uint8Array(bytes), "image/png");
      await db.insert(schema.leadPhotos).values({ leadId, storageKey: key, slot, contentType: "image/png", bytes: bytes.length, width: 720, height: 480, position, createdAt: created });
      photoTotal++;
    }
    events.push({ leadId, type: "system", data: { kind: "system", body: `Lead submitted online with ${slots.length} photo${slots.length === 1 ? "" : "s"}.` }, createdAt: created });

    // Automatic confirmations
    const t1 = new Date(created.getTime() + 20_000);
    msgs.push({ leadId, channel: "email", recipient: lead.email, template: "lead-received", subject: `We've got your ${lead.make} ${lead.model} — ref ${lead.ref}`, preview: `Thanks, ${first}. We've received the details of your ${year} ${lead.make} ${lead.model}.`, providerId: `seed-${randomBytes(6).toString("hex")}`, status: ages[i]! < 1 ? "sent" : "delivered", createdAt: t1, updatedAt: t1 });
    if (pref === "whatsapp") {
      const failed = i === 9;
      msgs.push({ leadId, channel: "whatsapp", recipient: lead.phone, template: "quote_received", preview: `Hi ${first}, thanks for sending us your ${lead.make} ${lead.model}. Your reference is ${lead.ref}.`, providerId: wamid(), status: failed ? "failed" : pick(["delivered", "read", "read"] as const), error: failed ? "131026 Message undeliverable" : null, createdAt: t1, updatedAt: t1 });
    }

    if (plan === "new") {
      await finish();
      continue;
    }

    // First response
    const replied = new Date(Math.min(now - 10 * MIN, created.getTime() + between(12, 300) * MIN));
    events.push({ leadId, type: "status", data: { kind: "status", from: "new", to: "contacted" }, ...actor, createdAt: replied });
    if (chance(0.7)) events.push({ leadId, type: "note", data: { kind: "note", body: pick(TEAM_NOTES) }, ...actor, createdAt: new Date(replied.getTime() + 2 * MIN) });
    let status: NewLead["status"] = "contacted";
    let closedAt: Date | null = null;
    let purchase: number | null = null;

    if (plan === "draft") {
      const at = new Date(replied.getTime() + 30 * MIN);
      const [q] = await db
        .insert(schema.quotes)
        .values({ leadId, version: 1, amountPence: value * 100, conditions: "Subject to inspection and a clear HPI check.", internalNotes: "Waiting for the settlement figure before sending.", status: "draft", validUntil: new Date(at.getTime() + 7 * DAY), tokenHash: randomBytes(32).toString("hex"), createdBy: danny.id, createdByName: danny.name, createdAt: at, updatedAt: at })
        .returning();
      quoteTotal++;
      events.push({ leadId, type: "quote", data: { kind: "quote", quoteId: q!.id, version: 1, amountPence: value * 100, action: "created" }, ...actor, createdAt: at });
    }

    if (["quoted", "viewed", "expired", "accepted", "rejected", "closed", "closed-lost"].includes(plan)) {
      const versions = chance(0.3) ? 2 : 1;
      let sentAt = new Date(Math.min(now - 5 * MIN, replied.getTime() + between(30, 600) * MIN));
      if (plan === "expired") sentAt = new Date(now - between(9, 14) * DAY);
      for (let v = 1; v <= versions; v++) {
        const final = v === versions;
        const amount = (value + (v - 1) * 500) * 100;
        const draftedAt = new Date(sentAt.getTime() - 5 * MIN);
        const viewedAt = plan === "quoted" && final ? null : new Date(sentAt.getTime() + between(20, 600) * MIN);
        let qStatus: "sent" | "viewed" | "accepted" | "declined" | "superseded" = "sent";
        let respondedAt: Date | null = null;
        let declineReason: string | null = null;
        if (!final) qStatus = "superseded";
        else if (plan === "viewed" || plan === "expired") qStatus = viewedAt && plan === "viewed" ? "viewed" : "sent";
        else if (plan === "accepted" || plan === "closed") {
          qStatus = "accepted";
          respondedAt = new Date(Math.min(now - 2 * MIN, (viewedAt ?? sentAt).getTime() + between(10, 900) * MIN));
        } else if (plan === "rejected" || plan === "closed-lost") {
          qStatus = "declined";
          respondedAt = new Date(Math.min(now - 2 * MIN, (viewedAt ?? sentAt).getTime() + between(30, 1400) * MIN));
          declineReason = pick(DECLINE);
        }
        const via = pref === "whatsapp" ? ["email", "whatsapp"] : ["email"];
        const [q] = await db
          .insert(schema.quotes)
          .values({
            leadId,
            version: v,
            amountPence: amount,
            conditions: "Subject to the vehicle matching the description and photos, a clear HPI check and the V5C in your name.",
            internalNotes: v === 1 ? "Top of trade per the last three auctions." : "Raised by £500 after the seller's call.",
            status: qStatus,
            validUntil: new Date(sentAt.getTime() + 7 * DAY),
            tokenHash: randomBytes(32).toString("hex"),
            sentVia: via,
            sentAt,
            viewedAt: plan === "expired" ? null : viewedAt,
            respondedAt,
            declineReason,
            createdBy: danny.id,
            createdByName: danny.name,
            createdAt: draftedAt,
            updatedAt: respondedAt ?? viewedAt ?? sentAt,
          })
          .returning();
        quoteTotal++;
        events.push({ leadId, type: "quote", data: { kind: "quote", quoteId: q!.id, version: v, amountPence: amount, action: "created" }, ...actor, createdAt: draftedAt });
        if (v === 1) events.push({ leadId, type: "status", data: { kind: "status", from: "contacted", to: "quoted" }, ...actor, createdAt: sentAt });
        events.push({ leadId, type: "quote", data: { kind: "quote", quoteId: q!.id, version: v, amountPence: amount, action: `sent via ${via.join(" + ")}` }, ...actor, createdAt: sentAt });
        msgs.push({ leadId, quoteId: q!.id, channel: "email", recipient: lead.email, template: "quote-offer", subject: `Your offer for the ${lead.make} ${lead.model}: £${(amount / 100).toLocaleString("en-GB")}`, preview: `Your offer for the ${year} ${lead.make} ${lead.model} is £${(amount / 100).toLocaleString("en-GB")}.`, providerId: `seed-${randomBytes(6).toString("hex")}`, status: "delivered", createdAt: sentAt, updatedAt: sentAt });
        if (via.includes("whatsapp")) {
          msgs.push({ leadId, quoteId: q!.id, channel: "whatsapp", recipient: lead.phone, template: "quote_offer", preview: `Hi ${first}, your offer for the ${lead.make} ${lead.model} is £${(amount / 100).toLocaleString("en-GB")}.`, providerId: wamid(), status: viewedAt ? "read" : "delivered", createdAt: sentAt, updatedAt: sentAt });
        }
        if (respondedAt) {
          const accepted = qStatus === "accepted";
          events.push({ leadId, type: "quote", data: { kind: "quote", quoteId: q!.id, version: v, amountPence: amount, action: accepted ? "accepted by seller" : `declined by seller: ${declineReason}` }, ...seller, createdAt: respondedAt });
          events.push({ leadId, type: "status", data: { kind: "status", from: "quoted", to: accepted ? "accepted" : "rejected" }, ...seller, createdAt: respondedAt });
          status = accepted ? "accepted" : "rejected";
          if (!accepted) closedAt = respondedAt;
          if (accepted && plan === "closed") {
            const done = new Date(Math.min(now - MIN, respondedAt.getTime() + between(1, 4) * DAY));
            purchase = amount - (chance(0.3) ? 25_000 : 0);
            closedAt = done;
            events.push({ leadId, type: "purchase", data: { kind: "system", body: `Purchase recorded at £${(purchase / 100).toLocaleString("en-GB")}.` }, ...actor, createdAt: done });
            events.push({ leadId, type: "status", data: { kind: "status", from: "accepted", to: "closed" }, ...actor, createdAt: done });
            status = "closed";
          }
          if (plan === "closed-lost") {
            const done = new Date(Math.min(now - MIN, respondedAt.getTime() + DAY));
            events.push({ leadId, type: "status", data: { kind: "status", from: "rejected", to: "closed" }, ...actor, createdAt: done });
            status = "closed";
            closedAt = done;
          }
        } else {
          status = "quoted";
        }
        sentAt = new Date(Math.min(now - 3 * MIN, sentAt.getTime() + between(4, 30) * HOUR));
      }
    }

    // An inbound WhatsApp reply on a couple of leads
    if (pref === "whatsapp" && (plan === "viewed" || plan === "accepted") && chance(0.7)) {
      events.push({ leadId, type: "whatsapp-inbound", data: { kind: "system", body: plan === "accepted" ? "Thanks, happy with that. When can you collect?" : "Thanks for the offer. Is there any room on the price?" }, actorName: lead.fullName, createdAt: new Date(Math.min(now - MIN, replied.getTime() + 20 * HOUR)) });
    }

    await db
      .update(schema.leads)
      .set({ status, firstResponseAt: replied, lastContactedAt: replied, closedAt, purchasePricePence: purchase, updatedAt: closedAt ?? replied })
      .where(inArray(schema.leads.id, [leadId]));
    await finish();

    async function finish() {
      if (events.length) await db.insert(schema.leadEvents).values(events);
      if (msgs.length) {
        const rows = await db.insert(schema.messages).values(msgs).returning({ id: schema.messages.id, channel: schema.messages.channel, template: schema.messages.template, status: schema.messages.status, createdAt: schema.messages.createdAt });
        messageTotal += rows.length;
        await db.insert(schema.leadEvents).values(rows.map((m) => ({ leadId, type: "message", data: { kind: "message" as const, messageId: m.id, channel: m.channel, status: `${m.template}: ${m.status}` }, createdAt: m.createdAt })));
      }
    }
  }

  // Sensible defaults for the settings screens, without overwriting real values.
  await db.insert(schema.settings).values({ key: "notify.emails", value: ["team@example.com"] }).onConflictDoNothing();

  console.log(`Seeded ${ages.length} demo leads, ${quoteTotal} quotes, ${messageTotal} messages and ${photoTotal} photos.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

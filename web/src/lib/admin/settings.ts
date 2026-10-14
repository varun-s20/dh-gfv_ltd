import "server-only";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { site } from "@/lib/site";
import { DEFAULT_CONVERSION_NAME } from "./conversions";

/**
 * Typed access to the settings table. Each key has a schema; a malformed or
 * missing row falls back to the default rather than breaking a page.
 */

export const DEFAULT_CONDITIONS =
  "Subject to the vehicle matching the description and photos you sent, a clear HPI check, and the V5C logbook in your name. Finance is settled with your lender from the sale price.";

export const settingSchemas = {
  "notify.emails": z.array(z.email()).max(20),
  "quote.defaults": z.object({
    conditions: z.string().max(2000),
    validDays: z.number().int().min(1).max(30),
  }),
  "ads.conversionName": z.string().trim().min(1).max(100),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export const settingDefaults: { [K in SettingKey]: SettingValue<K> } = {
  "notify.emails": [],
  "quote.defaults": { conditions: DEFAULT_CONDITIONS, validDays: site.promises.offerValidDays },
  "ads.conversionName": DEFAULT_CONVERSION_NAME,
};

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<{ [P in K]: SettingValue<P> }> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, keys));
  const out = {} as { [P in K]: SettingValue<P> };
  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    const parsed = row ? settingSchemas[key].safeParse(row.value) : null;
    out[key] = (parsed?.success ? parsed.data : settingDefaults[key]) as SettingValue<K>;
  }
  return out;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const all = await getSettings([key]);
  return all[key];
}

export async function putSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  const db = await getDb();
  const checked = settingSchemas[key].parse(value);
  await db
    .insert(schema.settings)
    .values({ key, value: checked })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: checked, updatedAt: new Date() } });
}

export async function settingUpdatedAt(key: SettingKey) {
  const db = await getDb();
  const [row] = await db.select({ updatedAt: schema.settings.updatedAt }).from(schema.settings).where(eq(schema.settings.key, key));
  return row?.updatedAt ?? null;
}

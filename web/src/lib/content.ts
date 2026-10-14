import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { landingPages, type LandingContent } from "@/content/landing";
import { getDb, schema } from "@/lib/db/client";
import type { Category } from "@/lib/vehicles";

/**
 * Editable copy. Defaults live in src/content; the admin "Content" screen stores
 * overrides in content_blocks. Pages stay static: the override read is cached and
 * the "content" tag is refreshed whenever an editor saves. Only the override is
 * cached, so the defaults (vehicles, lists, images) always come straight from code.
 */
export const CONTENT_TAG = "content";

export type LandingOverride = {
  hero?: Partial<Pick<LandingContent["hero"], "eyebrow" | "headline" | "sub" | "ctaLabel">> & { image?: string };
  cta?: Partial<LandingContent["cta"]>;
  seo?: Partial<LandingContent["seo"]>;
};

export const landingKey = (category: Category) => `landing.${category}`;

const clean = <T extends Record<string, unknown>>(obj: T | undefined) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => typeof v === "string" && v.trim() !== "")) as Partial<T>;

export async function getLandingContent(category: Category): Promise<LandingContent & { heroImage?: string }> {
  const base = landingPages[category];
  const override = await getLandingOverride(category);
  if (!override) return base;
  const hero = clean(override.hero);
  return {
    ...base,
    hero: { ...base.hero, ...hero },
    cta: { ...base.cta, ...clean(override.cta) },
    seo: { ...base.seo, ...clean(override.seo) },
    heroImage: typeof hero.image === "string" ? hero.image : undefined,
  };
}

async function getLandingOverride(category: Category) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("days");
  return readBlock<LandingOverride>(landingKey(category));
}

export async function readBlock<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    const [row] = await db.select().from(schema.contentBlocks).where(eq(schema.contentBlocks.key, key));
    return (row?.data as T) ?? null;
  } catch (error) {
    // Never let a content read take a landing page down; fall back to defaults.
    console.error("[content] read failed for", key, error);
    return null;
  }
}

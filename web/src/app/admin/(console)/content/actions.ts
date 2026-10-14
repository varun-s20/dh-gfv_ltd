"use server";

import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { done, formObject, invalid, type ActionState } from "@/lib/admin/action-state";
import { CONTENT_LIMITS } from "@/lib/admin/content-limits";
import { requireAdmin } from "@/lib/auth/session";
import { CONTENT_TAG, landingKey, type LandingOverride } from "@/lib/content";
import { getDb, schema } from "@/lib/db/client";
import { audit } from "@/lib/security";

const text = (label: string, max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .max(max, { error: `${label} must be ${max} characters or fewer.` })
        .refine((v) => (v.match(/\*/g)?.length ?? 0) % 2 === 0, { error: "Asterisks come in pairs: *word*." })
        .refine((v) => !/[<>]/.test(v), { error: "Remove < and > characters." }),
    );

const schemaFor = z.object({
  category: z.enum(["tesla", "ev", "van"]),
  heroEyebrow: text("Eyebrow", CONTENT_LIMITS.heroEyebrow),
  heroHeadline: text("Headline", CONTENT_LIMITS.heroHeadline),
  heroSub: text("Intro", CONTENT_LIMITS.heroSub),
  heroCtaLabel: text("Button label", CONTENT_LIMITS.heroCtaLabel),
  ctaHeading: text("Closing heading", CONTENT_LIMITS.ctaHeading),
  ctaSub: text("Closing line", CONTENT_LIMITS.ctaSub),
  seoTitle: text("SEO title", CONTENT_LIMITS.seoTitle),
  seoDescription: text("SEO description", CONTENT_LIMITS.seoDescription),
});

const compact = <T extends Record<string, string | undefined>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === "string" && v !== "")) as Partial<T>;

/** Save the overrides for one landing page. Empty fields fall back to the default copy. */
export async function saveLanding(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = schemaFor.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const key = landingKey(v.category);

  const db = await getDb();
  const [existing] = await db.select().from(schema.contentBlocks).where(eq(schema.contentBlocks.key, key));
  const previous = (existing?.data ?? {}) as LandingOverride;

  const data: LandingOverride = {
    hero: { ...compact({ eyebrow: v.heroEyebrow, headline: v.heroHeadline, sub: v.heroSub, ctaLabel: v.heroCtaLabel }), ...(previous.hero?.image ? { image: previous.hero.image } : {}) },
    cta: compact({ heading: v.ctaHeading, sub: v.ctaSub }),
    seo: compact({ title: v.seoTitle, description: v.seoDescription }),
  };
  const fields = Object.keys(data.hero ?? {}).length + Object.keys(data.cta ?? {}).length + Object.keys(data.seo ?? {}).length;

  if (fields === 0) {
    await db.delete(schema.contentBlocks).where(eq(schema.contentBlocks.key, key));
  } else {
    const row = { data: data as Record<string, unknown>, updatedBy: user.email, updatedAt: new Date() };
    await db.insert(schema.contentBlocks).values({ key, ...row }).onConflictDoUpdate({ target: schema.contentBlocks.key, set: row });
  }
  // Public landing pages are cached under CONTENT_TAG; expire them so the next visit shows the edit.
  updateTag(CONTENT_TAG);
  refresh();
  await audit("content.save", { actorId: user.id, actorEmail: user.email, target: key, detail: { before: previous, after: data } });
  return done(fields === 0 ? "Saved: this page uses the default copy" : "Changes saved and live");
}

const resetSchema = z.object({ category: z.enum(["tesla", "ev", "van"]) });

export async function resetLanding(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = resetSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error, "Choose a page to reset.");
  const key = landingKey(parsed.data.category);
  const db = await getDb();
  const removed = await db.delete(schema.contentBlocks).where(eq(schema.contentBlocks.key, key)).returning();
  updateTag(CONTENT_TAG);
  refresh();
  await audit("content.reset", { actorId: user.id, actorEmail: user.email, target: key, detail: { before: removed[0]?.data ?? null } });
  return done("Reset to the default copy");
}

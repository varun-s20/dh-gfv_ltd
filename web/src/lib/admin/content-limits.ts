/** Field limits for the landing-page editor, shared by the form (counters) and the Server Action (validation). */
export const CONTENT_LIMITS = {
  heroEyebrow: 40,
  heroHeadline: 90,
  heroSub: 320,
  heroCtaLabel: 30,
  ctaHeading: 90,
  ctaSub: 200,
  seoTitle: 60,
  seoDescription: 160,
} as const;

export type ContentField = keyof typeof CONTENT_LIMITS;

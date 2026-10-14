import type { BrowserContext, Page } from "@playwright/test";

/** Pre-set a cookie choice so the banner doesn't sit over what a test is checking. */
export async function decideCookies(context: BrowserContext, baseURL: string, choice: { analytics: boolean; marketing: boolean } = { analytics: false, marketing: false }) {
  const value = encodeURIComponent(JSON.stringify({ a: choice.analytics, m: choice.marketing, v: 1 }));
  const url = new URL(baseURL);
  await context.addCookies([{ name: "gf_consent", value, domain: url.hostname, path: "/" }]);
}

/** Collect uncaught page errors for a test to assert on. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export const PUBLIC_PAGES = [
  "/",
  "/sell-my-tesla",
  "/sell-my-electric-car",
  "/sell-my-electric-van",
  "/how-it-works",
  "/why-sell-to-us",
  "/brands",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/quote",
] as const;

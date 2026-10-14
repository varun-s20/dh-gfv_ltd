import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES, decideCookies, trackErrors } from "./helpers";

test.describe("public pages", () => {
  test.beforeEach(async ({ context, baseURL }) => decideCookies(context, baseURL!));

  for (const path of PUBLIC_PAGES) {
    test(`${path} renders cleanly`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      // Titles stay within what Google displays (~60 characters).
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThanOrEqual(70);
      // Nothing may push the page wider than the viewport on any device.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }

  test("every internal link resolves", async ({ page, request, browserName }) => {
    test.skip(browserName !== "chromium", "link crawl once is enough");
    const seen = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")!).filter(Boolean));
      hrefs.forEach((h) => seen.add(h.split("#")[0]!));
    }
    for (const href of seen) {
      const res = await request.get(href, { maxRedirects: 5 });
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  test("landing pages carry structured data and a WhatsApp route", async ({ page }) => {
    for (const path of ["/sell-my-tesla", "/sell-my-electric-car", "/sell-my-electric-van"]) {
      await page.goto(path);
      const ld = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => JSON.parse(e.textContent || "{}")["@type"]));
      expect(ld).toEqual(expect.arrayContaining(["FAQPage", "BreadcrumbList", "Service"]));
      await expect(page.locator('a[href^="https://wa.me/"]').first()).toBeAttached();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
    }
  });

  test("hero registration validates before leaving the page", async ({ page }) => {
    await page.goto("/sell-my-tesla");
    await page.getByRole("button", { name: "Get my Tesla offer" }).first().click();
    await expect(page.getByRole("alert").first()).toContainText("Enter your registration");
    await page.getByLabel("Vehicle registration").first().fill("ab12cde");
    await page.getByRole("button", { name: "Get my Tesla offer" }).first().click();
    await page.waitForURL(/\/quote\?reg=AB12CDE&category=tesla/);
  });

  test("unknown pages return 404 with a way back", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /Get my offer/ })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  test.beforeEach(async ({ context, baseURL }) => decideCookies(context, baseURL!));

  for (const path of ["/", "/sell-my-tesla", "/sell-my-electric-van", "/quote", "/contact", "/faq"]) {
    test(`${path} has no serious axe violations`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "axe once per page");
      await page.goto(path);
      // Let one-off entrances finish (mid-fade text reads as low contrast). Ambient
      // loops such as the pulsing status dot never finish, so they're skipped.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        ),
      );
      await page.waitForTimeout(3000);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test.describe("cookie consent", () => {
  test("nothing non-essential loads until the visitor accepts", async ({ page }) => {
    const thirdParty: string[] = [];
    page.on("request", (r) => {
      if (/googletagmanager|google-analytics|doubleclick/.test(r.url())) thirdParty.push(r.url());
    });
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Cookie choices" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Reject" }).click();
    await expect(banner).toBeHidden();
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "gf_consent")?.value).toContain("%22a%22%3Afalse");
    expect(thirdParty).toEqual([]);
  });
});

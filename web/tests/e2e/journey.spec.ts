import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { decideCookies } from "./helpers";

/**
 * The whole business loop against a local dev server:
 * seller submits → team prices and sends an offer → seller accepts → admin shows Accepted.
 *
 * Needs an admin login for the database the server uses:
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npx playwright test journey --project=desktop-chrome
 * The offer link is read from .data/outbox, where messages land when no email provider is configured.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const OUTBOX = path.join(process.cwd(), ".data", "outbox");

async function submitTeslaLead(page: Page, name: string) {
  await page.goto("/quote?reg=AB12CDE&category=tesla");
  const g = (n: string) => page.getByRole("group", { name: n });
  await g("Which model?").getByText("Model 3", { exact: true }).click();
  await page.selectOption("#year", "2021");
  await page.fill("#mileage", "42000");
  await page.getByRole("button", { name: "Continue" }).click();
  await g("Overall condition").getByText("Excellent", { exact: true }).click();
  await g("Service history").getByText("Full").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await g("Is there finance on it?").getByText("No", { exact: true }).click();
  await g("Key cards or keys").getByText("2", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.fill("#fullName", name);
  await page.fill("#postcode", "EN11 8TL");
  await page.fill("#phone", "07700 900456");
  await page.fill("#email", "journey.seller@example.com");
  await g("How should we send your offer?").getByText("Email", { exact: true }).click();
  await page.getByRole("button", { name: "Send for my offer" }).click();
  await page.waitForURL(/\/quote\/received\?ref=/, { timeout: 30_000 });
  return new URL(page.url()).searchParams.get("ref")!;
}

async function offerLinkFor(ref: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.endsWith("quote-offer.html"));
    const withTimes = await Promise.all(files.map(async (f) => ({ f, t: (await stat(path.join(OUTBOX, f))).mtimeMs })));
    for (const { f } of withTimes.sort((a, b) => b.t - a.t)) {
      const html = await readFile(path.join(OUTBOX, f), "utf8");
      const link = html.includes(ref) ? html.match(/https?:\/\/[^"'<\s]+\/offer\/([A-Za-z0-9_-]{20,64})/) : null;
      if (link) return `/offer/${link[1]}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No offer email found in the outbox for ${ref}`);
}

test.describe("seller-to-deal journey", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");

  test.setTimeout(180_000);

  test("a submitted lead can be priced, sent, accepted and shown as accepted", async ({ page, context, baseURL }) => {
    await decideCookies(context, baseURL!);
    const ref = await submitTeslaLead(page, "Journey Seller");
    expect(ref).toMatch(/^GF-[A-Z0-9]{5}$/);

    // Team signs in and finds the lead by its reference.
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL!);
    await page.fill('input[name="password"]', ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin$/);
    await page.goto(`/admin/leads?q=${encodeURIComponent(ref)}`);
    await page.getByRole("link", { name: /Tesla Model 3/ }).first().click();
    await expect(page.getByText(ref).first()).toBeVisible();

    // Price it and send by email.
    await page.locator('input[name="amount"]').fill("21,750");
    await page.getByRole("button", { name: "Send offer" }).click();
    // The action refreshes the page in place; don't wait for a navigation that never happens.
    await page.getByRole("group", { name: "Confirm sending" }).getByRole("button", { name: "Send now" }).click({ noWaitAfter: true });
    await expect(page.getByText(/Offer sent/).first()).toBeVisible({ timeout: 30_000 });

    // Seller opens the link from the email and accepts.
    const offer = await offerLinkFor(ref);
    const seller = await context.newPage();
    await seller.goto(offer);
    await expect(seller.getByRole("heading", { name: "£21,750" })).toBeVisible({ timeout: 30_000 });
    await seller.getByRole("button", { name: /Accept £21,750/ }).click();
    await seller.getByRole("button", { name: "Yes, accept the offer" }).click();
    await expect(seller.getByText("Offer accepted")).toBeVisible({ timeout: 30_000 });

    // The team sees the deal as accepted.
    await page.reload();
    await expect(page.locator('option[value="accepted"]:checked')).toHaveCount(1);
    await expect(page.getByText(/accepted by seller/i).first()).toBeVisible();
  });
});

import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { decideCookies, trackErrors } from "./helpers";

const PHOTO = path.join(__dirname, "fixtures", "car.jpg");

async function group(page: Page, name: string) {
  return page.getByRole("group", { name });
}

test.describe("quote flow", () => {
  test.beforeEach(async ({ context, baseURL }) => decideCookies(context, baseURL!, { analytics: true, marketing: true }));

  test("a Tesla owner can submit a complete request with a photo", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/sell-my-tesla?utm_source=google&utm_medium=cpc&utm_campaign=tesla-core&gclid=E2E-TEST");
    await page.getByLabel("Vehicle registration").first().fill("ab12cde");
    await page.getByRole("button", { name: "Get my Tesla offer" }).first().click();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Step 1 — required fields are enforced
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#year-err")).toContainText("Enter the year");
    await (await group(page, "Which model?")).getByText("Model Y", { exact: true }).click();
    await page.selectOption("#year", "2022");
    await page.fill("#mileage", "31,200");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — damage needs a description
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await (await group(page, "Overall condition")).getByText("Good", { exact: true }).click();
    await (await group(page, "Any damage?")).getByText("Minor").click();
    await (await group(page, "Service history")).getByText("Full").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#damageDetails-err")).toBeVisible();
    await page.fill("#damageDetails", "Light scuff on the rear bumper");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — finance and Tesla extras
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await (await group(page, "Is there finance on it?")).getByText("No", { exact: true }).click();
    await (await group(page, "Key cards or keys")).getByText("2", { exact: true }).click();
    await (await group(page, "Full Self-Driving")).getByText("Bought").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4 — upload one photo; the browser Back button returns to step 3
    await expect(page.getByText("Step 4 of 5")).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles(PHOTO);
    await expect(page.getByText("Uploaded").first()).toBeVisible({ timeout: 30_000 });
    await page.goBack();
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5 — contact and submit
    await expect(page.getByText("Step 5 of 5")).toBeVisible();
    await page.fill("#fullName", "E2E Seller");
    await page.fill("#postcode", "en118tl");
    await page.fill("#phone", "07700 900123");
    await page.fill("#email", "e2e.seller@example.com");
    await page.getByRole("button", { name: "Send for my offer" }).click();

    await page.waitForURL(/\/quote\/received\?ref=GF-[A-Z0-9]{5}/, { timeout: 30_000 });
    await expect(page.getByText("Your reference")).toBeVisible();
    const events = await page.evaluate(() => ((window as unknown as { dataLayer?: Array<{ event?: string }> }).dataLayer ?? []).map((e) => e.event).filter(Boolean));
    expect(events).toContain("generate_lead");
    expect(errors).toEqual([]);
  });

  test("answers survive a page reload on the same device", async ({ page }) => {
    await page.goto("/quote?reg=AB12CDE&category=tesla");
    await (await group(page, "Which model?")).getByText("Model 3", { exact: true }).click();
    await page.selectOption("#year", "2021");
    await page.waitForFunction(() => (localStorage.getItem("gf_quote_draft_v1") ?? "").includes('"year":"2021"'), null, { timeout: 10_000 });
    await page.reload();
    await expect(page.getByText("We kept your answers")).toBeVisible();
    await expect(page.locator("#year")).toHaveValue("2021");
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page.locator("#year")).toHaveValue("");
  });
});

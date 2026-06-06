/**
 * PR #001 E2E frontend tests.
 * Target: development server at http://localhost:3000
 * Run: npx playwright test test/pr001/test_frontend.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Page Load", () => {
  test("loads the home page", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Cleaning Robot/i);
  });

  test("displays title text", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("shows reset notice", async ({ page }) => {
    await page.goto(BASE_URL);
    const notice = page.locator("p").filter({ hasText: /03:00/ });
    await expect(notice).toBeVisible();
  });
});

test.describe("Language Switcher", () => {
  test("switches to English", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.selectOption("select[aria-label='Language']", "en");
    await expect(page.locator("h1")).toContainText("Next-Gen");
  });

  test("switches to Japanese", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.selectOption("select[aria-label='Language']", "ja");
    await expect(page.locator("h1")).toContainText("次世代");
  });
});

test.describe("Navigation Tabs", () => {
  test("map tab shows map form", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("form")).toBeVisible();
  });

  test("robot tab shows robot form", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole("button", { name: /Robot|ロボット|机器人/i }).first().click();
    await expect(page.locator("form")).toBeVisible();
  });

  test("history tab shows history section", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole("button", { name: /History|履歴|历史/i }).first().click();
    await expect(page.locator("h2").filter({ hasText: /History|履歴|历史/i })).toBeVisible();
  });
});

test.describe("Map Registration Flow", () => {
  test("registers a map and proceeds to robot tab", async ({ page }) => {
    await page.goto(BASE_URL);

    await page.fill("input[type='text']", "Test Map");

    const submitBtn = page.getByRole("button").filter({ hasText: /Map|マップ|地图/i }).last();
    await submitBtn.click();

    await expect(page.locator(".text-green-600, .text-green-700")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Honeypot", () => {
  test("honeypot field is hidden", async ({ page }) => {
    await page.goto(BASE_URL);
    const honeypot = page.locator("input[name='website']");
    await expect(honeypot).toBeHidden();
  });

  test("honeypot has empty value", async ({ page }) => {
    await page.goto(BASE_URL);
    const honeypot = page.locator("input[name='website']");
    await expect(honeypot).toHaveValue("");
  });
});

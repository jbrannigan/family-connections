import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Family Connections/i);
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/auth/login");
    // Should see the login form
    await expect(page.locator("form")).toBeVisible();
  });
});

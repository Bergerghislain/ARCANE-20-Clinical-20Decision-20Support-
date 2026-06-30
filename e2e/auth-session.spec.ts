import { expect, test } from "@playwright/test";

test.describe("Session auth avec refresh automatique", () => {
  test("reste connecté après expiration du token d'accès", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/doctor@arcane|email|username/i).fill("admin@arcane.com");
    await page.getByPlaceholder(/••••••••/).fill("password");
    await page.getByRole("button", { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/Patients|Dashboard/i).first()).toBeVisible();

    // Le backend E2E émet des tokens courts (ACCESS_TOKEN_EXPIRE_SECONDS=5).
    await page.waitForTimeout(6_000);

    await page.reload();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/Patients|Dashboard/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

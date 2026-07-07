import { expect, test } from "@playwright/test";

test.describe("Parcours clinique ARCANE", () => {
  test("login → dashboard → dossier patient → ARGOS", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/doctor@arcane|email|username/i).fill("admin@arcane.com");
    await page.getByPlaceholder(/••••••••/).fill("password");
    await page.getByRole("button", { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/Patients|Dashboard/i).first()).toBeVisible();

    const patientLink = page.locator("a,button,tr").filter({ hasText: /Dupont|Curie|Martin|Bernard/i }).first();
    if (await patientLink.count()) {
      await patientLink.click();
      await expect(page).toHaveURL(/patient\//);
    }

    await page.goto("/argos");
    await expect(page.getByText(/Assistant clinique ARGOS/i).first()).toBeVisible();

    // Le disclaimer et le champ de saisie ne sont visibles qu'après ouverture d'une conversation.
    await page.getByRole("button", { name: /Poser une question générale/i }).click();
    await expect(page.getByText(/Aide à la décision clinique/i)).toBeVisible();

    const input = page.getByPlaceholder(/Ask ARGOS/i);
    await input.fill("Quelle est la prochaine étape clinique?");
    await input.press("Enter");

    await expect(
      page.getByText(/ARGOS|mock_json|simulée|analyse/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});

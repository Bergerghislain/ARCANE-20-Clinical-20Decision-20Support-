import { test, expect, type Page } from "@playwright/test";

const DEMO_USER = process.env.E2E_USERNAME || "admin";
const DEMO_PASSWORD = process.env.E2E_PASSWORD || "password";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/doctor@arcane/i).fill(DEMO_USER);
  await page.getByPlaceholder("••••••••").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("parcours: login → dashboard → dossier patient", async ({ page }) => {
  await login(page);

  // Le dashboard clinicien liste les patients seedes.
  await expect(page.getByText("Jean Dupont").first()).toBeVisible();

  // Ouvre le dossier d'un patient.
  await page.getByRole("link", { name: /Jean Dupont/i }).first().click();
  await expect(page).toHaveURL(/\/patient\//);

  // Le dossier patient affiche ses onglets.
  await expect(page.getByText(/Patient Infos/i).first()).toBeVisible();
});

test("parcours: génération ARGOS (question générale)", async ({ page }) => {
  await login(page);

  await page.goto("/argos");
  await page.getByRole("button", { name: /ask a general question/i }).click();

  const input = page.getByPlaceholder(/ask argos/i);
  await expect(input).toBeVisible();
  await input.fill("Quelles sont les prochaines étapes possibles ?");
  await input.press("Enter");

  // Reponse de l'assistant (mode mock_json en CI/labo). Le garde-fou clinique reste visible.
  await expect(page.getByText(/mock_json/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(/aide à la décision clinique/i).first(),
  ).toBeVisible();
});

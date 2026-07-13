import { expect, test, type Page } from "@playwright/test";

function argosUserMessage(page: Page, text: string) {
  return page.getByTestId("argos-user-message").filter({ hasText: text });
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/doctor@arcane|email|username/i).fill("admin@arcane.com");
  await page.getByPlaceholder(/••••••••/).fill("password");
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

/** Ouvre une discussion ARGOS persistée côté API (patient seed Jean Dupont). */
async function startBackendArgosChat(page: Page) {
  await page.goto("/argos");
  await expect(page).not.toHaveURL(/login/, { timeout: 15_000 });

  await expect(page.getByTestId("argos-patient-selector-trigger")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("argos-patient-selector-trigger").click();

  const patientDropdown = page.locator(".max-h-80.overflow-y-auto");
  await expect(patientDropdown.getByText("Jean Dupont", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const discussionCreated = page.waitForResponse(
    (response) =>
      response.url().includes("/api/argos/discussions") &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: 20_000 },
  );

  const patientRow = patientDropdown
    .locator(".group")
    .filter({ hasText: "Jean Dupont" })
    .first();
  await patientRow.getByRole("button", { name: /New Chat/i }).click({ force: true });
  await discussionCreated;

  await expect(page.getByTestId("argos-chat-input")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Parcours clinique ARCANE", () => {
  test("login → dashboard → dossier patient → ARGOS", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText(/Patients|Dashboard/i).first()).toBeVisible();

    const patientLink = page
      .locator("a,button,tr")
      .filter({ hasText: /Dupont|Curie|Martin|Bernard/i })
      .first();
    if (await patientLink.count()) {
      await patientLink.click();
      await expect(page).toHaveURL(/patient\//);
    }

    await page.goto("/argos");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Assistant clinique ARGOS/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /Poser une question générale/i }).click();
    await expect(
      page.getByText(/ne se substitue pas au jugement médical/i),
    ).toBeVisible();

    const input = page.getByTestId("argos-chat-input");
    await input.fill("Quelle est la prochaine étape clinique?");
    await input.press("Enter");

    await expect(
      page.getByText(/ARGOS|mock_json|simulée|analyse/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("discussion ARGOS survit au F5", async ({ page }) => {
    await loginAsAdmin(page);
    await startBackendArgosChat(page);

    const question = "Test persistance ARGOS après rechargement";
    const input = page.getByTestId("argos-chat-input");
    const userMessage = argosUserMessage(page, question);

    const messageSaved = page.waitForResponse(
      (response) =>
        response.url().includes("/api/argos/discussions/") &&
        response.url().includes("/messages") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 20_000 },
    );

    await input.fill(question);
    await input.press("Enter");
    await messageSaved;
    await expect(userMessage).toBeVisible({ timeout: 15_000 });

    const historyReloaded = page.waitForResponse(
      (response) =>
        response.url().includes("/api/argos/discussions") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 },
    );

    await page.reload();
    await historyReloaded;

    await expect(page.getByTestId("argos-patient-selector-trigger")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("argos-chat-input")).toBeVisible({
      timeout: 20_000,
    });
    await expect(userMessage).toBeVisible({ timeout: 20_000 });
  });
});

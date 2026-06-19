import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "python -m uvicorn backend_fastapi.app.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/api/ping",
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        LLM_PROVIDER: "mock_json",
        JWT_SECRET: "e2e_test_secret",
        ALLOW_DEMO_PASSWORD_FALLBACK: "false",
      },
    },
    {
      command: "pnpm run dev",
      url: "http://127.0.0.1:8080",
      reuseExistingServer: !process.env.CI,
    },
  ],
});

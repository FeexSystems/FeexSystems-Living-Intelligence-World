import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PASS10_BASE_URL || "https://www.feexsystems.codes";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "playwright-report-pass10", open: "never" }], ["json", { outputFile: "test-results/pass10.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "retain-on-failure",
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});

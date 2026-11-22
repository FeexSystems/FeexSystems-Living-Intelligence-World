import { defineConfig, devices } from "@playwright/test";

/**
 * Isolated Phase 7 runner. This intentionally selects only the landing EIL
 * acceptance spec and Chromium; stale legacy E2E specs are not collected.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "eil-landing-projection.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

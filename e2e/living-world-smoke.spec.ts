import { test, expect } from "@playwright/test";

const publicRoutes = ["/", "/world", "/omni", "/projects", "/navigator", "/evidence"];

test.describe("FEEXSYSTEMS public World Model smoke matrix", () => {
  for (const route of publicRoutes) {
    test("loads " + route + " without an application error", async ({ page }) => {
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("text=/Application Error|Something went wrong|Cannot read properties/i")).toHaveCount(0);
      expect(consoleErrors.filter((message) => !message.includes("favicon")).length).toBe(0);
    });
  }
});

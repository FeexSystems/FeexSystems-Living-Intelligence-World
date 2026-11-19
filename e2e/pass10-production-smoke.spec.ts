import { test, expect, Page } from "@playwright/test";

const routes = ["/", "/world", "/omni", "/projects", "/navigator", "/evidence"] as const;
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

async function installRuntimeEvidence(page: Page, testInfo: any) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", err => pageErrors.push(err.message));

  await testInfo.attach("viewport", {
    body: JSON.stringify({ width: page.viewportSize()?.width, height: page.viewportSize()?.height }),
    contentType: "application/json",
  });

  return async () => {
    await testInfo.attach("console-errors", {
      body: JSON.stringify(consoleErrors, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("page-errors", {
      body: JSON.stringify(pageErrors, null, 2),
      contentType: "application/json",
    });
  };
}

async function assertHealthy(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(
    page.locator("text=/Application Error|Something went wrong|Cannot read properties|ChunkLoadError/i")
  ).toHaveCount(0);
}

test.describe("PASS 10 — production browser smoke matrix", () => {
  test("public routes load directly and survive refresh", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertHealthy(page);
      expect(page.url()).toContain(route === "/" ? new URL(page.url()).origin : route);
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertHealthy(page);
      await page.screenshot({
        path: testInfo.outputPath(`routes-${route === "/" ? "landing" : route.slice(1)}.png`),
        timeout: 20_000,
      });
    }
  });

  test("landing primary navigation and CTAs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const worldLink = page.getByRole("link", { name: /ENTER FEEX WORLD/i }).first();
    await expect(worldLink).toBeVisible();
    await worldLink.click();
    await expect(page).toHaveURL(/\/world$/);

    for (const path of ["/world", "/navigator", "/omni", "/evidence"] as const) {
      await page.goto("/");
      const link = page.locator(`a[href="${path}"]`).first();
      await expect(link).toBeVisible();
      await link.dispatchEvent("click");
      await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
    }
  });

  test("landing cinematic media initializes without blocking interaction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const videos = page.locator("video");
    const count = await videos.count();
    expect(count).toBeGreaterThan(0);

    await expect
      .poll(
        async () => {
          for (let i = 0; i < count; i++) {
            const ready = await videos.nth(i).evaluate((el: HTMLVideoElement) => el.readyState >= 2);
            if (ready) return true;
          }
          return false;
        },
        { timeout: 30_000, intervals: [500, 1000, 2000] },
      )
      .toBe(true);

    await expect(page.getByRole("link", { name: /ENTER FEEX WORLD/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /pause/i }).first()).toBeVisible();
  });

  test("worlds ecosystem filter responds", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const inspectButtons = page.locator('button:has-text("Inspect World")');
    const allCount = await inspectButtons.count();
    expect(allCount).toBeGreaterThan(0);

    await page.getByRole("button", { name: "AGRICULTURAL INTELLIGENCE", exact: true }).first().click();
    await expect.poll(async () => inspectButtons.count()).toBeLessThan(allCount);

    await page.getByRole("button", { name: "ALL", exact: true }).first().click();
    await expect.poll(async () => inspectButtons.count()).toBe(allCount);
  });

  test("Bushfeexer launcher opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const launcher = page.locator("#bushfeexer-toggle");
    await expect(launcher).toBeVisible();
    await expect(launcher).toHaveAttribute("aria-expanded", "false");

    await launcher.click();
    await expect(launcher).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#bushfeexer-window")).toBeVisible();

    await launcher.click();
    await expect(launcher).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#bushfeexer-window")).toHaveCount(0);
  });

  for (const viewport of viewports) {
    test(`responsive layout — ${viewport.name} ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const flush = await installRuntimeEvidence(page, testInfo);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await assertHealthy(page);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, "horizontal overflow detected").toBeFalsy();

      await expect(page.getByRole("link", { name: /ENTER FEEX WORLD/i }).first()).toBeVisible();
      await expect(page.locator("#bushfeexer-toggle")).toBeVisible();

      await page.screenshot({
        path: testInfo.outputPath(`responsive-${viewport.name}.png`),
        fullPage: true,
      });
      await flush();
    });
  }

  test("browser back/forward remains coherent", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /ENTER FEEX WORLD/i }).first().click();
    await expect(page).toHaveURL(/\/world$/);

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
    await assertHealthy(page);

    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/world$/);
    await assertHealthy(page);
  });
});

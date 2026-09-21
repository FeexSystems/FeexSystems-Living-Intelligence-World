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
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertHealthy(page);
      expect(page.url()).toContain(route === "/" ? new URL(page.url()).origin : route);
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertHealthy(page);
      await page.screenshot({
        path: testInfo.outputPath(`routes-${route === "/" ? "landing" : route.slice(1)}.png`),
        fullPage: true,
      });
    }
  });

  test("landing primary navigation and CTAs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const worldLink = page.getByRole("link", { name: /Explore Live 3D Galaxy/i }).first();
    await expect(worldLink).toBeVisible();
    await worldLink.click();
    await expect(page).toHaveURL(/\/world$/);

    await page.goto("/");
    const registerLink = page.getByRole("link", { name: /Launch Your Sovereign World Model/i }).first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register$/);

    await page.goto("/");
    for (const [label, path] of [
      [/3D Spatial World/i, "/world"],
      [/Projects Explorer/i, "/projects"],
      [/AI Navigator/i, "/navigator"],
      [/Omni-Command Stage/i, "/omni"],
      [/Evidence Fabric/i, "/evidence"],
    ] as const) {
      await page.goto("/");
      const link = page.getByRole("link", { name: label }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`\\${path}$`));
    }
  });

  test("landing cinematic media initializes without blocking interaction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "networkidle" });
    await assertHealthy(page);

    const videos = page.locator("video");
    const count = await videos.count();
    expect(count).toBeGreaterThan(0);

    let initialized = false;
    for (let i = 0; i < count; i++) {
      initialized = await videos.nth(i).evaluate((el: HTMLVideoElement) => el.readyState >= 2);
      if (initialized) break;
    }
    expect(initialized).toBeTruthy();

    await expect(page.getByRole("link", { name: /Explore Live 3D Galaxy/i }).first()).toBeVisible();
  });

  test("world carousel advances", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const next = page.getByRole("button", { name: "Next card" }).first();
    await expect(next).toBeVisible();

    const before = await page.locator("main").innerText();
    await next.click();
    await expect.poll(async () => page.locator("main").innerText()).not.toBe(before);
  });

  test("marketing tabs, simulator, and brief engine respond", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await assertHealthy(page);

    const navigatorTab = page.getByRole("button", { name: /4\. Grounded Navigator AI/i });
    await expect(navigatorTab).toBeVisible();
    await navigatorTab.click();
    await expect(page.getByText("Marketing Navigator Simulator")).toBeVisible();

    const query = page.getByRole("button", {
      name: /What changed in GitHub this week that is marketing-worthy/i,
    });
    await expect(query).toBeVisible();
    await query.click();

    const enginesTab = page.getByRole("button", { name: /3\. Gap & Decay Engines/i });
    await enginesTab.click();
    await expect(page.getByText("Content Gap Engine")).toBeVisible();

    const synthesize = page.getByRole("button", { name: /Synthesize Evidence Brief/i });
    await synthesize.click();
    await expect(page.getByText("Brief Synthesized:")).toBeVisible();
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

      await expect(page.getByRole("link", { name: /Explore Live 3D Galaxy/i }).first()).toBeVisible();
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
    await page.getByRole("link", { name: /Explore Live 3D Galaxy/i }).first().click();
    await expect(page).toHaveURL(/\/world$/);

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
    await assertHealthy(page);

    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/world$/);
    await assertHealthy(page);
  });
});

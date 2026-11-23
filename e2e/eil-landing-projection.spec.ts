import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path: string) => readFile(resolve(repoRoot, path), "utf8");

async function openVisibleHero(page: Page) {
  await page.goto("/");
  const hero = page.locator("#hero");
  await expect(hero).toBeVisible();
  await hero.scrollIntoViewIfNeeded();
}

async function expectProjectionAbsent(page: Page) {
  await expect(page.getByText(/EIL HUMANOID \/\//)).toHaveCount(0);
  await expect(page.locator("#hero canvas")).toHaveCount(0);
}

test.describe("Phase 7 · landing humanoid projection acceptance", () => {
  test("1. does not mount when reduced motion is preferred before navigation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openVisibleHero(page);
    await expectProjectionAbsent(page);
    await expect(page.getByRole("link", { name: "ENTER FEEX WORLD" })).toBeVisible();
  });

  test("2. does not mount when the browser requests save-data", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true, addEventListener() {}, removeEventListener() {} },
      });
    });
    await openVisibleHero(page);
    await expectProjectionAbsent(page);
  });

  test("3. does not mount on a low-power hardware profile", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "hardwareConcurrency", {
        configurable: true,
        get: () => 2,
      });
    });
    await openVisibleHero(page);
    await expectProjectionAbsent(page);
  });

  test("4. does not mount for a coarse-pointer device", async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        const result = original(query);
        if (query.includes("(pointer: coarse)")) {
          Object.defineProperty(result, "matches", { configurable: true, value: true });
        }
        if (query.includes("(pointer: fine)")) {
          Object.defineProperty(result, "matches", { configurable: true, value: false });
        }
        return result;
      };
    });
    await openVisibleHero(page);
    await expectProjectionAbsent(page);
  });

  test("5. does not mount when WebGL capability probing fails", async ({ page }) => {
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as any;
      const original = proto.getContext;
      proto.getContext = function (kind: string, ...args: any[]) {
        if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
        return original.apply(this, [kind, ...args]);
      };
    });
    await openVisibleHero(page);
    await expectProjectionAbsent(page);
  });

  test("6. does not keep the lazy projection mounted after the hero leaves view", async ({ page }) => {
    await openVisibleHero(page);
    await expect(page.getByText(/EIL HUMANOID \/\//)).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => window.scrollTo(0, Math.max(window.innerHeight * 1.5, 900)));
    await expect(page.getByText(/EIL HUMANOID \/\//)).toHaveCount(0, { timeout: 10_000 });
  });

  test("7. mounts the lazy canvas with explicit simulated and no-actuation disclosure when gates pass", async ({ page }) => {
    await openVisibleHero(page);
    await expect(page.locator("#hero canvas")).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByText(/EIL HUMANOID \/\//)).toContainText("NO PHYSICAL ACTUATION");
    await expect(page.getByText(/SIM/).first()).toBeVisible();
  });

  test("8. keeps the projection overlay pointer-transparent and hero CTA usable", async ({ page }) => {
    await openVisibleHero(page);
    await expect(page.getByText(/EIL HUMANOID \/\//)).toBeVisible({ timeout: 20_000 });
    const overlay = page.locator('[aria-hidden="true"]').filter({ hasText: "EIL HUMANOID" });
    await expect(overlay).toHaveCSS("pointer-events", "none");
    await page.getByRole("link", { name: "ENTER FEEX WORLD" }).click();
    await expect(page).toHaveURL(/\/world(?:$|\?)/);
  });

  test("9. HUD label exposes the resolved committed presentation state", async ({ page }) => {
    await openVisibleHero(page);
    const label = page.getByText(/EIL HUMANOID \/\//);
    await expect(label).toBeVisible({ timeout: 20_000 });
    await expect(label).toContainText(/(?:IDLE|THINKING)/);
  });

  test("10. bounded cursor zone changes IDLE to AWARE and clears outside the zone", async ({ page }) => {
    await openVisibleHero(page);
    const label = page.getByText(/EIL HUMANOID \/\//);
    await expect(label).toBeVisible({ timeout: 20_000 });
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Desktop viewport is required for bounded cursor acceptance");
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await expect(label).toContainText("AWARE");
    await page.mouse.move(2, 2);
    await expect(label).toContainText("IDLE");
  });

  test("11. global projection kill switch gates the landing lazy import and shared slot", async () => {
    const [overlay, canvas, slot] = await Promise.all([
      source("client/landing/components/HumanoidHeroOverlay.tsx"),
      source("client/landing/components/HumanoidHeroCanvas.tsx"),
      source("client/components/sovereign/EILProjectionSlot.tsx"),
    ]);
    expect(overlay).toMatch(/import\s*\{\s*EIL_PROJECTION_ENABLED\s*\}/);
    expect(overlay).toMatch(/EIL_PROJECTION_ENABLED\s*&&/);
    expect(canvas).toMatch(/enabled=\{EIL_PROJECTION_ENABLED\}/);
    expect(slot).toMatch(/if\s*\(!enabled\s*\|\|\s*!event\)\s*return\s+null/);
  });

  test("12. reduced-motion changes after mount remove the projection", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openVisibleHero(page);
    await expect(page.getByText(/EIL HUMANOID \/\//)).toBeVisible({ timeout: 20_000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectProjectionAbsent(page);
  });

  test("13. projection runtime adds no network, persistent storage, Firebase RTDB, or transport surface", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__eilWrites = [];
      const record = (kind: string) => {
        if ((window as any).__eilMonitor) (window as any).__eilWrites.push(kind);
      };
      const storageSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        record("storage.setItem");
        return storageSet.apply(this, args);
      };
      const indexedOpen = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args) {
        record("indexedDB.open");
        return indexedOpen.apply(this, args);
      };
      const originalFetch = window.fetch;
      window.fetch = function (...args) {
        record("fetch");
        return originalFetch.apply(this, args);
      };
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args) {
          record("WebSocket");
          return Reflect.construct(target, args);
        },
      });
      const OriginalEventSource = window.EventSource;
      window.EventSource = new Proxy(OriginalEventSource, {
        construct(target, args) {
          record("EventSource");
          return Reflect.construct(target, args);
        },
      });
    });
    const unexpectedRequests: string[] = [];
    page.on("request", (request) => {
      if (/firebase\/database|\/api\/world-model\/navigator|\/events(?:\?|$)/i.test(request.url())) {
        unexpectedRequests.push(request.url());
      }
    });
    await openVisibleHero(page);
    await expect(page.getByText(/EIL HUMANOID \/\//)).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => {
      (window as any).__eilWrites.length = 0;
      (window as any).__eilMonitor = true;
    });
    await page.waitForTimeout(750);
    const writes = await page.evaluate(() => (window as any).__eilWrites as string[]);
    expect(writes, "projection must not write persistent browser storage or open transports").toEqual([]);
    expect(unexpectedRequests).toEqual([]);

    const [canvas, runtime] = await Promise.all([
      source("client/landing/components/HumanoidHeroCanvas.tsx"),
      source("client/lib/eil/useEILAgentRuntime.ts"),
    ]);
    expect(canvas).not.toMatch(/firebase\/database|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|localStorage|sessionStorage|indexedDB|sendBeacon/);
    expect(runtime).not.toMatch(/firebase\/database|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|localStorage|sessionStorage|indexedDB|sendBeacon/);
  });

  test("14. demo never claims SPEAKING; route navigation unmounts the landing projection", async ({ page }) => {
    await openVisibleHero(page);
    const label = page.getByText(/EIL HUMANOID \/\//);
    await expect(label).toBeVisible({ timeout: 20_000 });
    // The actual landing demo only drives IDLE → THINKING → IDLE. It has no
    // playback-confirmed speech source and therefore must never claim SPEAKING.
    await page.waitForTimeout(14_500);
    await expect(label).not.toContainText("SPEAKING");
    await page.getByRole("link", { name: "ENTER FEEX WORLD" }).click();
    await expect(page).toHaveURL(/\/world(?:$|\?)/);
    await expect(page.getByText(/EIL HUMANOID \/\//)).toHaveCount(0);
  });

  test("15. OpenJarvis adoption preview is explicitly simulated and disconnected", async ({ page }) => {
    await openVisibleHero(page);
    const panel = page.getByTestId("openjarvis-adoption-panel");
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel).toContainText("OPENJARVIS // ADOPTION PREVIEW");
    await expect(panel).toContainText("SIMULATED");
    await expect(panel).toContainText("NOT CONNECTED");
    await expect(panel).toContainText("FEEX NAVIGATOR / POLICY GATE");
    await expect(panel).toContainText("CONTEXTUAL / ISOLATED");
    await expect(panel).toContainText("FABRIC ANCHOR / NOT CONNECTED");
    await expect(panel).toContainText("CANONICAL / READ ONLY");
    await expect(panel).toContainText("LOCAL SIMULATION / DISABLED");
    await expect(panel).toContainText("NO LIVE AGENT REQUESTS");
  });
});

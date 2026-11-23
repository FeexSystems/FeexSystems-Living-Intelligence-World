/**
 * Phase 6 — EIL projection FPS / long-task / mount-latency probe.
 *
 * Drives real headless Chromium against the dev server and reports:
 *  - EIL overlay mount latency (domcontentloaded -> canvas attached)
 *  - steady-state rAF FPS + frame-time percentiles over a sample window
 *  - longtask count/duration via PerformanceObserver
 *  - scroll-out unmount + scroll-in remount timing
 *
 * Read-only: no assertions, no app surface changes. Headless SwiftShader
 * WebGL numbers are a lower bound, not a GPU-accelerated figure.
 *
 * Usage: node scripts/phase6-fps-probe.mjs [baseURL]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:8080";
const SAMPLE_MS = 10_000;
const SETTLE_MS = 20_000;

const browser = await chromium.launch({
  args: [
    // Real GPU via ANGLE/D3D11 where available; headless still falls back
    // to SwiftShader on machines without a usable GPU.
    "--enable-gpu",
    "--use-angle=d3d11",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const t0 = Date.now();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator("#hero").waitFor({ state: "visible", timeout: 30_000 });
await page.evaluate(() => {
  document.querySelector(".snap-y")?.scrollTo({ top: 0 });
  window.scrollTo(0, 0);
});

// EIL overlay = the aria-hidden pointer-events-none root that carries the
// "EIL HUMANOID" disclosure (same scoping as the Phase 7 acceptance suite).
const overlay = page
  .locator("div.pointer-events-none[aria-hidden='true']")
  .filter({ hasText: "EIL HUMANOID" });
const canvas = overlay.locator("canvas");
await canvas.waitFor({ state: "attached", timeout: 60_000 });
const mountMs = Date.now() - t0;

// Let dev-server transforms, cinematic video, and the simulated agent
// cycle settle before sampling frame timing.
await page.waitForTimeout(SETTLE_MS);

const sample = () =>
  page.evaluate(async (sampleMs) => {
    const frames = [];
    const longtasks = [];
    let po;
    try {
      po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) longtasks.push(e.duration);
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch {
      /* longtask unsupported */
    }
    await new Promise((resolve) => {
      const start = performance.now();
      const tick = (t) => {
        frames.push(t);
        if (t - start < sampleMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    po?.disconnect();
    const deltas = frames.slice(1).map((t, i) => t - frames[i]);
    deltas.sort((a, b) => a - b);
    const pct = (p) =>
      deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))] ?? 0;
    const avgDelta =
      deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
    return {
      frames: deltas.length,
      fps: Math.round((1000 / avgDelta) * 10) / 10,
      frameMsP50: Math.round(pct(0.5) * 100) / 100,
      frameMsP95: Math.round(pct(0.95) * 100) / 100,
      frameMsMax: Math.round((deltas[deltas.length - 1] ?? 0) * 100) / 100,
      longtaskCount: longtasks.length,
      longtaskTotalMs: Math.round(longtasks.reduce((a, b) => a + b, 0)),
    };
  }, SAMPLE_MS);

const steadyState = await sample();

// Scroll-out unmount / scroll-in remount, mirroring the Phase 7 gate.
await page.evaluate(() => {
  document
    .querySelector(".snap-y")
    ?.scrollTo({ top: window.innerHeight * 1.5 });
});
const unmountDeadline = Date.now() + 20_000;
while (Date.now() < unmountDeadline) {
  if ((await canvas.count()) === 0) break;
  await page.waitForTimeout(250);
}
const unmounted = (await canvas.count()) === 0;

await page.evaluate(() => {
  document.querySelector(".snap-y")?.scrollTo({ top: 0 });
  window.scrollTo(0, 0);
});
const remountT0 = Date.now();
await canvas.waitFor({ state: "attached", timeout: 60_000 });
const remountMs = Date.now() - remountT0;

const postRemount = await sample();

const glRenderer = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  if (!gl) return "no-webgl";
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
});

console.log(
  JSON.stringify(
    { mountMs, settleMs: SETTLE_MS, glRenderer, steadyState, unmounted, remountMs, postRemount },
    null,
    2,
  ),
);
await browser.close();

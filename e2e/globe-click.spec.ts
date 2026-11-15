/**
 * Globe Click Playwright Verification
 *
 * Tests the real globe interaction path: clicking a canonical world pin on the
 * SPATIAL GALAXY scene (NoirWebGLScene) emits `feex:world-selected`, which
 * `WorldSelectionRouter` in App.tsx converts into a SPA navigation to
 * `/world/:worldId`.
 *
 * Notes on robustness:
 * - The globe itself is a third-party WebGL canvas (`@globestudio/react`); its
 *   raycast hit-testing is not deterministic in headless mode. The scene renders
 *   HTML world pins (`[data-world-pin]`) over the canvas for accessibility, and
 *   those pins call the exact same `handleWorldClick` -> `feex:world-selected`
 *   path the globe uses, so we drive that surface instead.
 * - Custom events are captured by installing the listener *inside* the page
 *   before interacting (page.evaluate), because `window` in the test runner is
 *   the Node process, not the browser window. The scene renders in the main
 *   frame, so no iframe-sandbox workaround is required.
 *
 * Reference: continuation-note.md — open item 1 (Playwright globe click routing).
 */

import { test, expect, type Page } from '@playwright/test'

const WORLD_SELECTED_FLAG = '__feexWorldSelected'

/** Install an in-page recorder for the `feex:world-selected` custom event. */
async function recordWorldSelections(page: Page) {
  await page.evaluate((flag) => {
    const w = window as unknown as Record<string, unknown>
    if (w[flag]) return
    w[flag] = []
    window.addEventListener('feex:world-selected', (event) => {
      const detail = (event as CustomEvent<{ worldId?: string }>).detail
      ;(w[flag] as Array<{ worldId?: string }>).push(detail ?? {})
    })
  }, WORLD_SELECTED_FLAG)
}

// The landing is a cinematic snap-scroll deck. Playwright's scroll-into-view
// fights CSS scroll-snap (it can retry indefinitely), and the scene wipe covers
// the viewport, so reduced motion keeps the deck settled and interactive.
test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })

/** Bring the spatial galaxy scene into view without relying on snap scrolling. */
async function openSpatialGalaxy(page: Page) {
  await page.goto('/')
  await page.waitForSelector('[data-world-pin]', { state: 'attached', timeout: 30000 })

  const clickable = await page
    .locator('[data-world-pin]')
    .first()
    .isEnabled({ timeout: 10000 })
    .catch(() => false)

  // Scroll the scene rather than the pin so scroll-snap settling isn't triggered
  // by Playwright's own scroll-into-view during the click.
  if (!clickable) {
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('#fx-webgl')?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
    })
  }
}

test.describe('Globe Click — feex:world-selected event', () => {
  test('clicking a canonical world pin emits feex:world-selected and routes to the world detail page', async ({ page }) => {
    await openSpatialGalaxy(page)

    const pins = page.locator('[data-world-pin]')
    await expect(pins.first()).toBeVisible({ timeout: 30000 })

    // 1. Start from a route that is not a world detail page.
    expect(new URL(page.url()).pathname).not.toMatch(/^\/world\//)

    // 2. Record custom events from inside the page before interacting.
    await recordWorldSelections(page)

    // 3. Click the first canonical world pin — the same handler the globe's
    //    `onWorldClick` callback invokes.
    const firstPin = pins.first()
    const expectedWorldId = await firstPin.getAttribute('data-world-pin')
    expect(expectedWorldId).toBeTruthy()

    await firstPin.click({ timeout: 15000 })

    // 4. The event must fire with the clicked world id.
    await expect
      .poll(
        async () => {
          const recorded = await page.evaluate(
            (flag) => (window as unknown as Record<string, Array<{ worldId?: string }>>)[flag] ?? [],
            WORLD_SELECTED_FLAG,
          )
          return recorded.map((entry) => entry.worldId)
        },
        { timeout: 10000, message: 'feex:world-selected should be emitted after clicking a world pin' },
      )
      .toContain(expectedWorldId)

    // 5. The router must navigate to the world detail surface.
    await expect(page).toHaveURL(new RegExp(`/world/${expectedWorldId}(?:$|[/?#])`))

    // 6. The world detail surface renders for that id.
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })

  test('a dispatched feex:world-selected event routes without a globe interaction', async ({ page }) => {
    await page.goto('/')
    await recordWorldSelections(page)

    // Simulate a world click from any other surface (e.g. Omni-Command or a
    // holographic navigator) and assert routing stays centralized in
    // App.tsx's WorldSelectionRouter.
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('feex:world-selected', { detail: { worldId: 'test-globe-world-001' } }))
    })

    await expect(page).toHaveURL(/\/world\/test-globe-world-001(?:$|[/?#])/)
  })
})

import { test, expect } from "@playwright/test";

/**
 * Humanoid Hero — Scene 01 acceptance tests.
 *
 * Pins the blocking scene-order contract: the rigged humanoid hero is the
 * first landing scene and the cinematic identity film is second. These tests
 * supplement — never replace — screenshot-based visual inspection.
 *
 * The landing is heavy (12 scenes, deferred media, WebGL stages), so tests
 * get an extended budget and navigate on domcontentloaded.
 */

test.describe("humanoid hero scene order", () => {
  test.describe.configure({ timeout: 90_000 });

  test("humanoid is the first landing scene", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const humanoid = page.locator("#humanoid-hero");
    const cinematic = page.locator("#hero");

    await expect(humanoid).toBeVisible();
    await expect(cinematic).toBeAttached();

    // DOM order is the contract — bounding rects depend on scroll position,
    // which snap-scrolling and test navigation can legitimately change.
    const follows = await humanoid.evaluate(
      (el, other) =>
        !!(
          el.compareDocumentPosition(document.querySelector(other)!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      "#hero"
    );
    expect(follows).toBe(true);
  });

  test("scene sections appear in humanoid → cinematic order", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const order = await page
      .locator(".snap-y > section")
      .evaluateAll((sections) => sections.map((s) => s.id));

    expect(order[0]).toBe("humanoid-hero");
    expect(order[1]).toBe("hero");
    expect(order.indexOf("humanoid-hero")).toBeLessThan(
      order.indexOf("hero")
    );
  });

  test("hero actions remain visible and addressable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("#humanoid-hero");
    await expect(
      hero.getByRole("link", { name: /enter feex world/i })
    ).toBeVisible();
    await expect(
      hero.getByRole("link", { name: /explore the systems/i })
    ).toBeVisible();
  });

  test("humanoid interaction prompts are keyboard operable", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("#humanoid-hero");
    const greet = hero.getByRole("button", { name: "GREET" });
    await expect(greet).toBeVisible();
    // Interaction controls enable once the GLB reports ready; reduced-motion
    // or a failed model keeps them disabled.
    await expect(greet).toBeEnabled({ timeout: 30_000 });

    // Pressing Enter must drive the same state transition as a pointer
    // click — this is the keyboard-operability contract.
    await greet.press("Enter");
    await expect(hero.getByText(/WELCOME/).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("status strip reports honest simulation labels", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("#humanoid-hero");
    await expect(
      hero.getByText(/LOCAL VISUAL SIMULATION/i).first()
    ).toBeVisible();
    await expect(
      hero.getByText(/NO PHYSICAL ACTUATION/i).first()
    ).toBeVisible();
  });
});

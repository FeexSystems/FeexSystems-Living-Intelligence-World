import { test, expect } from "@playwright/test";

const publicRoutes = ["/", "/world", "/omni", "/projects", "/navigator", "/evidence"];

test.describe("FEEXSYSTEMS public World Model smoke matrix", () => {
  for (const route of publicRoutes) {
    test("loads " + route + " without an application error", async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("text=/Application Error|Something went wrong|Cannot read properties/i")).toHaveCount(0);
    });
  }
});

test.describe("Monochromatic Noir Theme Validation", () => {
  test("landing page uses noir color palette", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Check for absence of phosphor green/cyan colors in inline styles
    const body = await page.locator("body").evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color
      };
    });
    
    // Background should be black or very dark
    expect(body.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0/);
  });

  test("3D scene loads with WebGL context", async ({ page }) => {
    await page.goto("/world", { waitUntil: "domcontentloaded" });
    
    // Wait for canvas to be present
    await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 });
    
    // Check WebGL context exists
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return canvas && !!(canvas as any).getContext("webgl2") || !!(canvas as any).getContext("webgl");
    });
    
    expect(hasWebGL).toBeTruthy();
  });

  test("sovereign engine HUD renders with noir styling", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Wait for potential sovereign engine section
    await page.waitForTimeout(2000);
    
    // Check for white/silver color usage instead of green/cyan
    const hasNoirColors = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      let hasWhiteAccent = false;
      let hasPhosphorGreen = false;
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const color = computed.color;
        const bg = computed.backgroundColor;
        
        // Check for white/silver accents
        if (color.includes("255, 255, 255") || color.includes("rgb(255, 255, 255)")) {
          hasWhiteAccent = true;
        }
        
        // Check for phosphor green (should not exist)
        if (color.includes("0, 255, 65") || bg.includes("0, 255, 65")) {
          hasPhosphorGreen = true;
        }
      });
      
      return { hasWhiteAccent, hasPhosphorGreen };
    });
    
    expect(hasNoirColors.hasWhiteAccent).toBeTruthy();
    expect(hasNoirColors.hasPhosphorGreen).toBeFalsy();
  });
});

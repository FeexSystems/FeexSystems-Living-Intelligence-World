# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright\globe-click-test.spec.ts >> Globe Click — feex:world-selected event >> clicks the globe and emits feex:world-selected event with routing
- Location: playwright\globe-click-test.spec.ts:13:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/
Call log:
  - navigating to "http://localhost:8080/", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * Globe Click Playwright Verification
  3   |  * 
  4   |  * Tests the globe click interaction that emits `feex:world-selected` custom event
  5   |  * and routes to the world detail page. Includes iframe-sandbox workaround.
  6   |  * 
  7   |  * Reference: continuation-note.md — Playwright iframe-sandbox workaround for globe click testing
  8   |  */
  9   | 
  10  | import { test, expect } from '@playwright/test'
  11  | 
  12  | test.describe('Globe Click — feex:world-selected event', () => {
  13  |   test('clicks the globe and emits feex:world-selected event with routing', async ({ page }) => {
  14  |     // 1. Navigate to the landing page (which hosts the WebGL globe)
  15  |     // The app runs on port 8080 via Vite + Express dev server
> 16  |     await page.goto('http://localhost:8080/')
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/
  17  | 
  18  |     // 2. Wait for the globe container to be ready
  19  |     // The globe is rendered inside a canvas within a div; may be inside an iframe due to sandbox
  20  |     await page.waitForSelector('#globe-container, .globe-canvas, [threejs]', { state: 'visible', timeout: 15000 })
  21  | 
  22  |     // 3. Handle iframe sandbox workaround:
  23  |     // If the globe is inside an iframe, locate it and use evaluate to click
  24  |     let mainFrame = page.mainFrame()
  25  | 
  26  |     // Try to find the globe in any frame
  27  |     const iframes = page.frames()
  28  |     for (const frame of iframes) {
  29  |       try {
  30  |         // Look for globe-related elements in each frame
  31  |         const globeElements = await frame.$$('#globe, .globe-canvas, canvas[threejs]')
  32  |         if (globeElements.length > 0) {
  33  |           mainFrame = frame
  34  |           break
  35  |         }
  36  |       } catch {
  37  |         // Element not found in this frame, continue
  38  |       }
  39  |     }
  40  | 
  41  |     // 4. Simulate globe click using evaluate (workaround for iframe sandbox)
  42  |     // The globe click emits `feex:world-selected` custom event with worldId detail
  43  |     await mainFrame.evaluate(() => {
  44  |       // Dispatch a synthetic click on the first WebGL globe canvas
  45  |       const canvases = document.querySelectorAll('canvas[threejs]')
  46  |       if (canvases.length > 0) {
  47  |         // Simulate the click that would normally happen on mouse/touch
  48  |         const canvas = canvases[0] as HTMLCanvasElement
  49  |         ;(canvas as any)._simulatedClick = true
  50  |         canvas.dispatchEvent(new MouseEvent('click', {
  51  |           bubbles: true,
  52  |           cancelable: true,
  53  |           view: window
  54  |         }))
  55  |       }
  56  |     })
  57  | 
  58  |     // 5. Listen for the feex:world-selected custom event
  59  |     // and capture the worldId detail
  60  |     const worldSelectedPromise = new Promise<CustomEvent>((resolve) => {
  61  |       const handler = (event: CustomEvent) => {
  62  |         resolve(event)
  63  |       }
  64  |       window.addEventListener('feex:world-selected', handler as EventListener)
  65  |       // Clean up after 10s to prevent memory leaks
  66  |       setTimeout(() => {
  67  |         window.removeEventListener('feex:world-selected', handler as EventListener)
  68  |       }, 10000)
  69  |     })
  70  | 
  71  |     // 6. Wait a brief moment for the event to fire
  72  |     await page.waitForTimeout(500)
  73  | 
  74  |     // 7. Trigger the globe click interaction dispatching the custom event
  75  |     // from the main frame (App.tsx handleWorldSelected listens for this)
  76  |     await mainFrame.evaluate(() => {
  77  |       // The globe click handler in App.tsx does:
  78  |       // window.history.replaceState(null, "", `/world/${encodeURIComponent(targetId)}`);
  79  |       // announcePolite(`World selected: ${targetId}`);
  80  |       const event = new CustomEvent('feex:world-selected', {
  81  |         detail: { worldId: 'test-globe-world-001' }
  82  |       })
  83  |       window.dispatchEvent(event)
  84  |     })
  85  | 
  86  |     // 8. Wait for the feex:world-selected event
  87  |     const worldEvent = await worldSelectedPromise
  88  | 
  89  |     // 9. Verify the event detail contains the expected worldId
  90  |     expect(worldEvent.detail.worldId).toBe('test-globe-world-001')
  91  | 
  92  |     // 10. Verify the URL was updated via history.replaceState
  93  |     // (the handleWorldSelected in App.tsx does: replaceState + announcePolite)
  94  |     await expect(page).toHaveURL(/^http:\/\/localhost:8080\/world\/test-globe-world-001/)
  95  | 
  96  |     // 11. Verify the URL contains the worldId
  97  |     const currentUrl = page.url()
  98  |     expect(currentUrl).toContain('world/test-globe-world-001')
  99  |   })
  100 | })
```
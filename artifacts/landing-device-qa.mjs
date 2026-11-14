export default async function run(page) {
  const errors = [];
  const failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push({ url: request.url(), error: request.failure()?.errorText }));
  const result = {};
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded' });
    await page.locator('#missions').waitFor({ state: 'attached' });
    const missionText = await page.locator('#missions').innerText();
    const missionFallback = await page.locator('[aria-label="Mission capability registry"]').count();
    const projectionFallback = await page.locator('[aria-label="Cinematic world projections"]').count();
    const missionsScreenshot = `artifacts/landing-${viewport.name}-missions-full.png`;
    await page.locator('#missions').screenshot({ path: missionsScreenshot });
    const globe = await page.locator('#fx-webgl').evaluate(el => ({
      text: el.innerText.slice(0, 450),
      iframeCount: el.querySelectorAll('iframe').length,
      worldFallbackCount: el.querySelectorAll('[aria-label="Canonical worlds static projection fallback"] li').length,
      disclosureOpen: el.querySelector('details')?.open,
      disclosureSummary: el.querySelector('summary')?.innerText,
    }));
    await page.locator('#fx-webgl summary').click();
    globe.disclosureOpenAfterClick = await page.locator('#fx-webgl details').getAttribute('open');
    const stack = await page.locator('#fx-capabilities').evaluate(el => {
      const node = el.querySelector('.touch-pan-y');
      return { touchAction: node ? getComputedStyle(node).touchAction : null, scrollHeight: document.scrollingElement?.scrollHeight, innerHeight };
    });
    await page.screenshot({ path: `artifacts/landing-${viewport.name}-capabilities.png` });
    result[viewport.name] = { missionFallback, projectionFallback, missionHasAllFive: ['001','002','003','004','005'].every(id => missionText.includes(`Mission ${id}`)), globe, stack };
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  result.reducedMotion = await page.evaluate(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  result.errors = errors;
  result.failedRequests = failed;
  return result;
}

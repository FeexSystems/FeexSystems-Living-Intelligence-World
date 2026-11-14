export default async function run(page) {
  const errors = [];
  const failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push({ url: request.url(), error: request.failure()?.errorText }));
  const result = {};
  await page.locator('#missions').waitFor({ state: 'attached', timeout: 20000 });
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const mission = await page.locator('#missions').evaluate(el => ({
      text: el.innerText.slice(0, 1100),
      registry: el.querySelector('[aria-label="Mission capability registry"]')?.innerText,
      projections: el.querySelector('[aria-label="Cinematic world projections"]')?.innerText,
      overflowWidth: el.scrollWidth > el.clientWidth,
      bounds: (() => { const r = el.getBoundingClientRect(); return { width: Math.round(r.width), height: Math.round(r.height) }; })(),
    }));
    const globe = await page.locator('#fx-webgl').evaluate(el => ({
      text: el.innerText.slice(0, 500),
      iframeCount: el.querySelectorAll('iframe').length,
      fallbackWorldCount: el.querySelectorAll('[aria-label="Canonical worlds static projection fallback"] li').length,
      disclosure: !!el.querySelector('details'),
      disclosureSummary: el.querySelector('summary')?.innerText,
    }));
    await page.locator('#fx-webgl summary').click();
    globe.disclosureToggleWorks = (await page.locator('#fx-webgl details').getAttribute('open')) !== null;
    const capabilities = await page.locator('#fx-capabilities').evaluate(el => ({
      worldIndexDuplicate: el.innerText.includes('CAP/02'),
      touchPanY: [...el.querySelectorAll('.touch-pan-y')].map(node => getComputedStyle(node).touchAction),
      overflowWidth: el.scrollWidth > el.clientWidth,
    }));
    await page.locator('#missions').screenshot({ path: `artifacts/landing-${viewport.name}-mission-check.png` });
    result[viewport.name] = { mission, globe, capabilities };
  }
  result.errors = errors;
  result.failedRequests = failed;
  return result;
}

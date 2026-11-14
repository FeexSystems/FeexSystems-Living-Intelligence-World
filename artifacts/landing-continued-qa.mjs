export default async function run(page) {
  const results = {};
  await page.addStyleTag({ content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}` });
  const missions = page.locator('#missions');
  await missions.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(300);
  results.missions = await missions.evaluate((el) => ({ text: el.innerText, rect: (() => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })(), fallbackCards: el.querySelectorAll('figure img').length, registry: el.querySelector('[aria-label="Mission capability registry"]')?.innerText ?? null }));
  await missions.screenshot({ path: 'artifacts/continued-missions-desktop.png' });
  const spatial = page.locator('#fx-webgl');
  await spatial.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(300);
  results.spatial = await spatial.evaluate((el) => ({ text: el.innerText.slice(0,900), rect: (() => { const r=el.getBoundingClientRect(); return {y:r.y,width:r.width,height:r.height}; })(), worldRows: el.querySelectorAll('[aria-label="Canonical worlds static projection fallback"] li').length, indexSummary: el.querySelector('summary')?.innerText ?? null, globeFrames: el.querySelectorAll('iframe').length }));
  await spatial.screenshot({ path: 'artifacts/continued-spatial-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const cap = page.locator('#fx-capabilities');
  await cap.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(300);
  results.mobile = await cap.evaluate((el) => ({ width: innerWidth, stackTouchAction: el.querySelector('.touch-pan-y') ? getComputedStyle(el.querySelector('.touch-pan-y')).touchAction : null, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, text: el.innerText.slice(0,500) }));
  await cap.screenshot({ path: 'artifacts/continued-capabilities-mobile.png' });
  results.globals = await page.evaluate(() => ({ viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, heroSubtitle: document.querySelector('#hero')?.innerText.includes('provider-neutral AI orchestration platform'), ldJsonCount: document.querySelectorAll('script[type="application/ld+json"]').length }));
  return results;
}

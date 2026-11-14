export default async function run(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('#missions').waitFor({ state: 'attached', timeout: 30000 });
  await page.locator('#missions').scrollIntoViewIfNeeded();
  const missions = await page.locator('#missions').innerText({ timeout: 15000 });
  const registry = await page.locator('[aria-label="Mission capability registry"]').innerText().catch(() => 'MISSING');
  const projections = await page.locator('[aria-label="Cinematic world projections"]').innerText().catch(() => 'MISSING');
  await page.screenshot({ path: 'artifacts/landing-missions-qa.png', fullPage: false });
  return { missions: missions.slice(0, 1400), registry, projections, errors };
}

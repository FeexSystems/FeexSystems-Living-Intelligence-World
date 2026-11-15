export default async function run(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForSelector('[data-testid="landing-root"]', { timeout: 30000 });
  for (const id of ['missions', 'fx-primitives', 'fx-webgl', 'fx-capabilities']) {
    const section = page.locator(`#${id}`);
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(200);
  }
  await page.locator('.snap-y').evaluate(el => { el.scrollTop = 0; });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const split = [...document.querySelectorAll('h1,h2,h3,[role=heading]')].filter(h => h.textContent.trim().length > 1 && [...h.querySelectorAll('span,strong,em,b,i')].filter(n => n.textContent.trim().length === 1).length > 1).length;
    const worldNames = root => new Set([...root.querySelectorAll('[data-canonical-world]')].map(n => n.getAttribute('data-canonical-world'))).size;
    const sec9 = document.querySelector('#fx-webgl [data-section="09"]');
    const sec10 = document.querySelector('#fx-capabilities [data-section="10"]');
    return { mojibake: (text.match(/â€”|â€“|ðŸŒ™|�/g) || []).length, splitLetterNodes: split, worldPins: document.querySelectorAll('#fx-webgl [data-world-pin]').length, section09Worlds: worldNames(document.querySelector('#fx-webgl')), section10Worlds: worldNames(document.querySelector('#fx-capabilities')), section09Declared: Number(sec9?.dataset.worldCount), section10Declared: Number(sec10?.dataset.worldCount) };
  });
  result.pageErrors = errors;
  result.passed = result.mojibake === 0 && result.splitLetterNodes === 0 && result.worldPins === 9 && result.section09Worlds === 9 && result.section10Worlds === 9 && result.section09Declared === 9 && result.section10Declared === 9 && errors.length === 0;
  return result;
}

import { chromium } from "playwright";

const baseUrl = process.env.LANDING_AUDIT_URL ?? "http://localhost:8080/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  if (!response?.ok()) throw new Error(`Landing request failed: ${response?.status() ?? "no response"}`);
  await page.waitForSelector('[data-testid="landing-root"]', { timeout: 30000 });
  await page.evaluate(async () => {
    const scroller = document.querySelector(".snap-y");
    if (!scroller) return;
    for (const section of scroller.querySelectorAll("section[id]")) {
      section.scrollIntoView({ block: "start" });
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    scroller.scrollTop = 0;
  });
  await page.waitForTimeout(400);
  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const mojibakeMatches = text.match(/â€”|â€“|ðŸŒ™|�/g) ?? [];
    const splitLetterNodes = [...document.querySelectorAll("h1,h2,h3,[role=heading]")].filter((heading) => {
      const textContent = heading.textContent?.trim() ?? "";
      const visibleElements = [...heading.querySelectorAll("span,strong,em,b,i")].filter((node) => (node.textContent?.trim().length ?? 0) === 1);
      return textContent.length > 1 && visibleElements.length > 1;
    }).length;
    const section09 = document.querySelector('#fx-webgl [data-section="09"]');
    const section10 = document.querySelector('#fx-capabilities [data-section="10"]');
    const worldPins = section09?.querySelectorAll('[data-world-pin]').length ?? 0;
    const section09Count = Number(section09?.getAttribute("data-world-count") ?? 0);
    const section10Count = Number(section10?.getAttribute("data-world-count") ?? 0);
    const countUniqueWorlds = (root) => new Set([...root?.querySelectorAll('[data-canonical-world]') ?? []].map((node) => node.getAttribute("data-canonical-world"))).size;
    const section09Entries = countUniqueWorlds(section09);
    const section10Entries = countUniqueWorlds(section10);
    return { mojibake: mojibakeMatches.length, splitLetterNodes, worldPins, section09Entries, section10Entries, section09Count, section10Count };
  });
  const passed = result.mojibake === 0 && result.splitLetterNodes === 0 && result.worldPins === 9 && result.section09Entries === 9 && result.section10Entries === 9 && result.section09Count === 9 && result.section10Count === 9 && errors.length === 0;
  console.log(JSON.stringify({ url: baseUrl, ...result, pageErrors: errors, passed }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await browser.close();
}

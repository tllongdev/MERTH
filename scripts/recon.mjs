// Live recon: what does Home Depot's DOM look like today?
// Usage: node scripts/recon.mjs
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const STORE_ID = "1912";
const ITEM_ID = "205952637"; // DEWALT drill bit set, from fixtures
const PDP = `https://www.homedepot.com/p/${ITEM_ID}`;

const phone = devices["iPhone 12 landscape"] ?? devices["iPhone 12"];
const browser = await chromium.launch({ headless: true });

const report = {};

async function probe(label, opts) {
  const context = await browser.newContext({ ...opts, locale: "en-US" });
  await context.addCookies([
    { name: "THD_LOCALIZED_STORE_ID", value: STORE_ID, domain: ".homedepot.com", path: "/" },
  ]);
  const page = await context.newPage();
  const r = { label, blocked: false };
  try {
    const resp = await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 45000 });
    r.status = resp?.status();
    await page.waitForTimeout(4000);
    r.title = await page.title();
    const html = await page.content();
    r.htmlLen = html.length;
    // Bot-wall heuristics
    r.blocked = /access denied|reference #|akamai|are you a robot|unusual traffic/i.test(html) ||
      (r.title ?? "").toLowerCase().includes("access denied");
    // Keyword presence in raw HTML
    r.keywords = {};
    for (const kw of ["Aisle", "Bay", "storemarker", "storemap", "store-availability", "Find in Store", "aisleLocation", "bayLocation", "data-x", "viewBox"]) {
      r.keywords[kw] = html.split(kw).length - 1;
    }
    // Selector presence (current scraper selectors + likely-new ones)
    const sels = [
      "div.cartTotals",
      "a > .store-availability__content",
      "#store-availability",
      "g.storemarker",
      ".storemap-wrapper",
      "[data-component='StoreMap']",
      "[class*='aisle' i]",
      "[class*='store-map' i]",
      "[data-testid*='aisle' i]",
      "[data-testid*='store' i]",
    ];
    r.selectors = {};
    for (const s of sels) {
      try {
        r.selectors[s] = await page.$$eval(s, (els) => els.length);
      } catch (e) {
        r.selectors[s] = `err:${String(e).slice(0, 40)}`;
      }
    }
    writeFileSync(`/tmp/recon-${label}.html`, html);
    await page.screenshot({ path: `/tmp/recon-${label}.png`, fullPage: false });
  } catch (e) {
    r.error = String(e).slice(0, 200);
  } finally {
    await context.close();
  }
  return r;
}

report.mobile = await probe("mobile", phone);
report.desktop = await probe("desktop", {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  viewport: { width: 1366, height: 900 },
});

await browser.close();
console.log(JSON.stringify(report, null, 2));

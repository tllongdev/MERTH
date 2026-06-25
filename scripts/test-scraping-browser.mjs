// Verify a hosted scraping browser actually gets past Home Depot's Akamai wall.
//
// 1. Put your provider's CDP endpoint in .env.local as SCRAPING_BROWSER_CDP_URL
// 2. Run: node --env-file=.env.local scripts/test-scraping-browser.mjs
//
// Success = HTTP 200 on a product page and "Aisle"/"storemap" keywords present.
// Failure = 403 / "Error Page" (still blocked) or a connection error.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const endpoint = process.env.SCRAPING_BROWSER_CDP_URL;
if (!endpoint) {
  console.error("SCRAPING_BROWSER_CDP_URL is not set. See .env.example.");
  process.exit(1);
}

const STORE_ID = "1912";
const PDP = "https://www.homedepot.com/p/205952637"; // DEWALT drill bit set (from fixtures)

console.log("Connecting to hosted scraping browser...");
const browser = await chromium.connectOverCDP(endpoint);

// Hosted scraping browsers often restrict newContext(); fall back to default.
let page;
try {
  const ctx = await browser.newContext({ locale: "en-US" });
  page = await ctx.newPage();
} catch {
  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  page = ctx.pages()[0] ?? (await ctx.newPage());
}

try {
  await page.context().addCookies([
    { name: "THD_LOCALIZED_STORE_ID", value: STORE_ID, domain: ".homedepot.com", path: "/" },
  ]);

  const resp = await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const status = resp?.status();
  await page.waitForTimeout(5_000);
  const html = await page.content();
  const blocked = (await page.title()).toLowerCase().includes("error page") || html.length < 5_000;

  const keywords = {};
  for (const kw of ["Aisle", "Bay", "storemarker", "storemap", "store-availability", "Find in Store"]) {
    keywords[kw] = html.split(kw).length - 1;
  }

  writeFileSync("/tmp/sb-pdp.html", html);
  await page.screenshot({ path: "/tmp/sb-pdp.png", fullPage: false });

  console.log(JSON.stringify({ status, blocked, htmlLen: html.length, keywords }, null, 2));
  console.log(blocked ? "\n❌ Still blocked." : "\n✅ Got through. Saved /tmp/sb-pdp.html and /tmp/sb-pdp.png");
} catch (e) {
  console.error("Error:", String(e).slice(0, 300));
} finally {
  await browser.close();
}

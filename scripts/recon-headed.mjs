// Probe whether a headed (non-headless) Chromium gets past Akamai.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ locale: "en-US", viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const out = {};
try {
  const resp = await page.goto("https://www.homedepot.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
  out.homeStatus = resp?.status();
  await page.waitForTimeout(5000);
  out.homeTitle = await page.title();
  const html = await page.content();
  out.homeLen = html.length;
  out.homeBlocked = (out.homeTitle ?? "").toLowerCase().includes("error page") || html.length < 5000;

  if (!out.homeBlocked) {
    const pdp = await page.goto("https://www.homedepot.com/p/205952637", { waitUntil: "domcontentloaded", timeout: 45000 });
    out.pdpStatus = pdp?.status();
    await page.waitForTimeout(5000);
    const ph = await page.content();
    out.pdpLen = ph.length;
    out.pdpKeywords = {};
    for (const kw of ["Aisle", "Bay", "storemarker", "storemap", "store-availability", "Find in Store"]) {
      out.pdpKeywords[kw] = ph.split(kw).length - 1;
    }
    writeFileSync("/tmp/recon-headed-pdp.html", ph);
  }
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 2));

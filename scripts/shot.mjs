// Captures docs/screenshot.png from a running dev server.
// Usage: PORT=3000 node scripts/shot.mjs   (start `npm run dev` first)
import { chromium } from "playwright";

const port = process.env.PORT ?? "3000";
const out = process.env.OUT ?? "docs/screenshot.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Plan my route" }).click();
await page.waitForSelector("svg[aria-label='Optimized in-store route']");
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`saved ${out}`);

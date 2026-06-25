import type { CartItem, LocatedItem } from "../types";
import { parseLocation } from "../routing";

/**
 * Faithful, modernized port of the original MERTH scraper (legacy/scraper.js).
 *
 * WHY THIS EXISTS (and why it is not "just call an API"):
 * Home Depot exposes aisle/bay *text*, but there is NO public API for the store
 * map geometry - the SVG floor plan or the per-product drop-pin (x,y). Those
 * coordinates are the only thing that lets us draw a real route on a real map,
 * so we must read them the way the original did: drive a mobile-emulated browser
 * to each product's "view on store map" view and read the `g.storemarker`
 * `data-x` / `data-y`, and grab the store-map SVG itself as the render canvas.
 *
 * STATUS (recon 2026-06-25): BLOCKED BY AKAMAI BOT MANAGER, not just stale
 * selectors. A headless browser is served a 403 "Error Page" immediately. A
 * headed browser loads the homepage (200) but product pages STILL 403 after a
 * homepage warm - Akamai re-validates the `_abck` sensor on deep navigation and
 * a vanilla automated browser fails it. So the selectors below (inherited from
 * the 2020 build) cannot even be re-verified until the bot wall is solved:
 *   - stealth tooling (playwright-extra / patchright / rebrowser),
 *   - a real Akamai sensor-data warm-up, and most likely
 *   - residential proxies,
 *   - OR a third-party unblocker/scraping API that already handles Akamai.
 * Every step is wrapped so a single broken item degrades to "location unknown"
 * instead of aborting the run. Run `npx playwright install chromium` before use.
 */

export interface ScrapeResult {
  items: LocatedItem[];
  /** Raw <svg> markup of the store floor plan, in the same coordinate space as the pins. */
  storeMapSvg: string | null;
}

// VERIFY against live site. These are the original selectors as a starting point.
const SELECTORS = {
  cartReady: "div.cartTotals",
  cartItem: "div.cartItem",
  itemBrand: "h3.cartItem__brandName_mobile",
  itemLink: "div.cartImage > a",
  storeMapLink: "#store-availability > div > fieldset > div > a",
  locationText: "a > .store-availability__content",
  storeMarker: "g.storemarker",
  storeMapWrapper: ".storemap-wrapper",
  zoomOut: "rect.minus-box",
};

/**
 * Acquire a browser. If `SCRAPING_BROWSER_CDP_URL` is set we connect to a hosted
 * "scraping browser" (Bright Data / ZenRows / Oxylabs) over CDP - that managed
 * service handles Akamai (residential IPs + sensor solving + retries), which a
 * local browser cannot. Otherwise we launch locally (works for dev, but Home
 * Depot's bot wall will 403 product pages - see the STATUS note above).
 */
async function acquireBrowser(): Promise<{ browser: import("playwright").Browser; remote: boolean }> {
  const { chromium } = await import("playwright");
  const cdpUrl = process.env.SCRAPING_BROWSER_CDP_URL;
  if (cdpUrl) {
    return { browser: await chromium.connectOverCDP(cdpUrl), remote: true };
  }
  return { browser: await chromium.launch({ headless: true }), remote: false };
}

export async function scrapeStore(cartUrl: string, storeId: string): Promise<ScrapeResult> {
  const { devices } = await import("playwright");

  // The interactive store map historically only rendered on the mobile site, so
  // we emulate a phone exactly like the original did.
  const phone = devices["iPhone 12 landscape"] ?? devices["iPhone 12"];

  const { browser } = await acquireBrowser();
  const items: LocatedItem[] = [];
  let storeMapSvg: string | null = null;

  try {
    const context = await browser.newContext({ ...phone, locale: "en-US" });
    // Pin the store up front (more robust than clicking the store-picker chain).
    await context.addCookies([
      { name: "THD_LOCALIZED_STORE_ID", value: storeId, domain: ".homedepot.com", path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto(cartUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(SELECTORS.cartReady, { timeout: 30_000 });

    // Snapshot the cart contents up front so we have stable hrefs to iterate.
    const cartBasics = await extractCartBasics(page);

    for (const base of cartBasics) {
      const located = await locateItem(page, base, storeId, SELECTORS);
      items.push(located);
      // Capture the floor-plan SVG once, from the first item that renders a map.
      if (!storeMapSvg && located.x !== null) {
        storeMapSvg = await captureMapSvg(page, SELECTORS.storeMapWrapper);
      }
    }

    return { items, storeMapSvg };
  } finally {
    await browser.close();
  }
}

/** Read the cart DOM into a list of items with product URLs to visit. */
async function extractCartBasics(page: import("playwright").Page): Promise<CartItem[]> {
  return page.$$eval(SELECTORS.cartItem, (nodes) =>
    nodes.map((node) => {
      const anchor = node.querySelector<HTMLAnchorElement>("div.cartImage > a");
      const href = anchor?.getAttribute("href") ?? "";
      const url = href.startsWith("http") ? href : href ? `https:${href}` : "";
      const idMatch = url.match(/\/(\d{6,})(?:[/?#]|$)/);
      const img = node.querySelector<HTMLImageElement>("img");
      const nameEl = node.querySelector("h3.cartItem__brandName_mobile, h3.cartItem__brandName");
      const qtyEl = node.querySelector<HTMLInputElement>("input.cartItem__qtyInput");
      return {
        itemId: idMatch ? idMatch[1] : url,
        name: (nameEl?.textContent ?? "Unknown item").trim(),
        qty: qtyEl ? Number.parseInt(qtyEl.value, 10) || 1 : 1,
        imageUrl: img?.src,
        productUrl: url,
      };
    }),
  );
}

/** Visit a product page, read aisle/bay text, open the store map, read the pin. */
async function locateItem(
  page: import("playwright").Page,
  base: CartItem,
  _storeId: string,
  sel: typeof SELECTORS,
): Promise<LocatedItem> {
  let locationText: string | null = null;
  let x: number | null = null;
  let y: number | null = null;

  try {
    if (base.productUrl) {
      await page.goto(base.productUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    }

    // Aisle/Bay label.
    const locEl = await page.$(sel.locationText);
    if (locEl) {
      locationText = ((await locEl.textContent()) ?? "").trim() || null;
    }

    // Open the interactive store map for this item, then read its drop pin.
    const mapLink = await page.$(sel.storeMapLink);
    if (mapLink) {
      await mapLink.click();
      await page.waitForSelector(sel.storeMarker, { timeout: 15_000 });
      const marker = await page.$(sel.storeMarker);
      if (marker) {
        const dx = await marker.getAttribute("data-x");
        const dy = await marker.getAttribute("data-y");
        x = dx !== null ? Number.parseFloat(dx) : null;
        y = dy !== null ? Number.parseFloat(dy) : null;
      }
    }
  } catch {
    // Leave location null - item is surfaced as "grab at the front" in the UI.
  }

  const parsed = parseLocation(locationText);
  return {
    ...base,
    locationText,
    aisle: parsed.aisle,
    bay: parsed.bay,
    x,
    y,
    inStock: x !== null,
  };
}

/** Grab the store floor-plan SVG markup so we can render the route on the real map. */
async function captureMapSvg(
  page: import("playwright").Page,
  wrapperSelector: string,
): Promise<string | null> {
  try {
    return await page.$eval(`${wrapperSelector} svg`, (svg) => svg.outerHTML);
  } catch {
    return null;
  }
}

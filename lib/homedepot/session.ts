/**
 * Akamai session warming for homedepot.com.
 *
 * Home Depot's `/federation-gateway/graphql` endpoint is fronted by Akamai Bot
 * Manager. A bare `fetch` is challenged immediately. The reliable pattern (used
 * by every serious HD scraper) is to drive a real stealthed Chromium to the
 * homepage once, let Akamai issue its `_abck` / `bm_sz` cookies, optionally pin
 * the store, and then reuse those cookies for fast JSON GraphQL calls.
 *
 * Playwright is the ONLY place a browser is launched - all data fetching after
 * this is plain HTTP against the gateway (see client.ts). This keeps the hot
 * path fast and avoids brittle DOM automation.
 *
 * Run `npx playwright install chromium` once before using live mode.
 */

export interface HdSession {
  cookieHeader: string;
  userAgent: string;
  storeId: string;
}

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Launch a headless Chromium, acquire Akamai cookies for the given store, and
 * return a reusable cookie header + UA. Imports Playwright lazily so demo mode
 * never pays the cost.
 */
export async function warmSession(storeId: string): Promise<HdSession> {
  // Lazy import: keeps Playwright out of the bundle unless live mode is used.
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: DEFAULT_UA,
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    // Pin the store via cookie so subsequent GraphQL calls are store-scoped.
    await context.addCookies([
      {
        name: "THD_LOCALIZED_STORE_ID",
        value: storeId,
        domain: ".homedepot.com",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    await page.goto("https://www.homedepot.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    // Give Akamai a beat to set the sensor cookies.
    await page.waitForTimeout(2_500);

    const cookies = await context.cookies("https://www.homedepot.com");
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    return { cookieHeader, userAgent: DEFAULT_UA, storeId };
  } finally {
    await browser.close();
  }
}

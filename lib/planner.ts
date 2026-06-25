import { DEMO_CHECKOUT, DEMO_ENTRANCE, DEMO_STORE_ID, getDemoCart } from "./fixtures";
import { scrapeStore } from "./homedepot/scraper";
import { planRoute } from "./routing";
import { injectRouteIntoMap } from "./svg";
import type { PlanResult } from "./types";

const ROUTE_SEED = 42; // fixed seed -> reproducible routes for a given cart

/** Demo mode: real captured cart + real store-map coordinates, no network. */
export function planDemo(): PlanResult {
  const items = getDemoCart();
  const route = planRoute(items, {
    entrance: DEMO_ENTRANCE,
    checkout: DEMO_CHECKOUT,
    seed: ROUTE_SEED,
  });
  return { storeId: DEMO_STORE_ID, source: "demo", items, route };
}

/**
 * Live mode: drive a mobile-emulated browser to scrape each item's real
 * store-map drop-pin (x,y) and the floor-plan SVG (the only source of plottable
 * coordinates - Home Depot has no public API for map geometry), optimize the
 * route, and render it onto the real map.
 */
export async function planLive(cartUrl: string, storeId: string): Promise<PlanResult> {
  const { items, storeMapSvg } = await scrapeStore(cartUrl, storeId);
  if (items.length === 0) {
    throw new Error("No items found in that cart (it may be empty, private, or expired).");
  }
  const route = planRoute(items, { seed: ROUTE_SEED });
  const mapSvg = storeMapSvg ? injectRouteIntoMap(storeMapSvg, route) : null;
  return { storeId, source: "live", items, route, mapSvg };
}

import type { CartItem, LocatedItem } from "../types";
import { parseLocation } from "../routing";
import type { HdSession } from "./session";

/**
 * Home Depot federation GraphQL client.
 *
 * IMPORTANT - reverse-engineering note:
 * Home Depot does not publish a GraphQL schema. The operation names below
 * (`getCart`, `productClientOnlyProduct`) are the ones the live site uses, but
 * the exact query bodies and the field path that carries aisle/bay drift over
 * time. To (re)capture them: open homedepot.com DevTools -> Network -> filter
 * `graphql`, add an item to a cart and open a PDP with a store selected, then
 * copy the request payloads (or export a HAR). Paste the verified query strings
 * into the `*_QUERY` constants here. The parsing functions are defensive and
 * return nulls rather than throwing when a field is absent, so a schema drift
 * degrades gracefully (item shows as "location unknown") instead of crashing.
 */

const GRAPHQL_URL = "https://www.homedepot.com/federation-gateway/graphql";

function baseHeaders(session: HdSession): Record<string, string> {
  return {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": session.userAgent,
    cookie: session.cookieHeader,
    "x-experience-name": "general-merchandise",
    "apollographql-client-name": "general-merchandise",
    referer: "https://www.homedepot.com/",
    origin: "https://www.homedepot.com",
  };
}

async function gql<T>(
  session: HdSession,
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${GRAPHQL_URL}?opname=${operationName}`, {
    method: "POST",
    headers: baseHeaders(session),
    body: JSON.stringify({ operationName, query, variables }),
  });
  if (!res.ok) {
    throw new Error(
      `Home Depot GraphQL ${operationName} failed: ${res.status} ${res.statusText}. ` +
        `Likely an Akamai challenge - re-warm the session.`,
    );
  }
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Home Depot GraphQL ${operationName} returned errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) throw new Error(`Home Depot GraphQL ${operationName} returned no data.`);
  return json.data;
}

/** Pull sharedCartId (and friends) out of a shared-cart URL. */
export function parseSharedCartUrl(cartUrl: string): { sharedCartId: string } {
  const url = new URL(cartUrl);
  const sharedCartId = url.searchParams.get("sharedCartId");
  if (!sharedCartId) {
    throw new Error("That does not look like a Home Depot shared-cart URL (missing sharedCartId).");
  }
  return { sharedCartId };
}

// --- Cart -------------------------------------------------------------------

// VERIFY against a live capture (see note at top of file).
const CART_QUERY = /* GraphQL */ `
  query getCart($sharedCartId: String!) {
    cartInfo(sharedCartId: $sharedCartId) {
      items {
        product {
          itemId
          identifiers { brandName productLabel }
          media { image { url } }
        }
        quantity
        pricing { unitPrice }
      }
    }
  }
`;

interface RawCartResponse {
  cartInfo?: {
    items?: Array<{
      product?: {
        itemId?: string;
        identifiers?: { brandName?: string; productLabel?: string };
        media?: { image?: { url?: string } };
      };
      quantity?: number;
      pricing?: { unitPrice?: number };
    }>;
  };
}

export async function fetchSharedCart(session: HdSession, cartUrl: string): Promise<CartItem[]> {
  const { sharedCartId } = parseSharedCartUrl(cartUrl);
  const data = await gql<RawCartResponse>(session, "getCart", CART_QUERY, { sharedCartId });
  const items = data.cartInfo?.items ?? [];
  return items
    .filter((it) => it.product?.itemId)
    .map((it) => ({
      itemId: it.product!.itemId as string,
      name: it.product?.identifiers?.productLabel ?? "Unknown item",
      brand: it.product?.identifiers?.brandName,
      qty: it.quantity ?? 1,
      unitPrice: it.pricing?.unitPrice,
      imageUrl: it.product?.media?.image?.url,
      productUrl: `https://www.homedepot.com/p/${it.product!.itemId}`,
    }));
}

// --- Per-item store location ------------------------------------------------

// VERIFY against a live capture. Aisle/bay live under the store-scoped
// fulfillment/inventory location for the pinned store.
const PRODUCT_QUERY = /* GraphQL */ `
  query productClientOnlyProduct($itemId: String!, $storeId: String) {
    product(itemId: $itemId) {
      itemId
      fulfillment(storeId: $storeId) {
        fulfillmentOptions {
          type
          services {
            type
            locations {
              isAnchor
              inventory { isInStock quantity }
              storeName
              aisle: aisleLocation
              bay: bayLocation
            }
          }
        }
      }
    }
  }
`;

interface RawProductResponse {
  product?: {
    fulfillment?: {
      fulfillmentOptions?: Array<{
        type?: string;
        services?: Array<{
          type?: string;
          locations?: Array<{
            isAnchor?: boolean;
            inventory?: { isInStock?: boolean; quantity?: number };
            aisle?: string | null;
            bay?: string | null;
          }>;
        }>;
      }>;
    };
  };
}

/**
 * Resolve a single item's in-store aisle/bay at the pinned store.
 *
 * Note: the interactive store-map (x,y) coordinates that the original MERTH used
 * are NOT returned by GraphQL - they come from the per-store SVG map asset. Live
 * mode therefore returns aisle/bay only; map coordinates are synthesized from the
 * aisle/bay grid in the planner. (Capturing real x,y would require fetching the
 * store-map SVG, a documented follow-up.)
 */
export async function fetchItemLocation(
  session: HdSession,
  base: CartItem,
  storeId: string,
): Promise<LocatedItem> {
  let aisle: string | null = null;
  let bay: string | null = null;
  let inStock = false;

  try {
    const data = await gql<RawProductResponse>(session, "productClientOnlyProduct", PRODUCT_QUERY, {
      itemId: base.itemId,
      storeId,
    });
    const opts = data.product?.fulfillment?.fulfillmentOptions ?? [];
    for (const opt of opts) {
      for (const svc of opt.services ?? []) {
        const loc = (svc.locations ?? []).find((l) => l.aisle || l.bay) ?? svc.locations?.[0];
        if (loc) {
          aisle = aisle ?? loc.aisle ?? null;
          bay = bay ?? loc.bay ?? null;
          inStock = inStock || Boolean(loc.inventory?.isInStock);
        }
      }
    }
  } catch {
    // Degrade gracefully: item simply shows as location-unknown.
  }

  const locationText = aisle ? `Aisle ${aisle}${bay ? `, Bay ${bay}` : ""}` : null;
  const parsed = parseLocation(locationText);

  return {
    ...base,
    locationText,
    aisle: parsed.aisle,
    bay: parsed.bay,
    x: null,
    y: null,
    inStock,
  };
}

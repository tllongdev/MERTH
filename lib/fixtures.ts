import type { LocatedItem } from "./types";
import type { Pt } from "./salesman";
import { parseLocation } from "./routing";

/**
 * Real cart data captured from the original 2020 MERTH proof-of-concept run
 * (see legacy/test.js). Coordinates are in Home Depot's interactive store-map
 * pixel space for store #1912. Used for demo mode so the full pipeline -
 * routing + map + checklist - works end-to-end without hitting the live site.
 */

interface RawItem {
  itemId: string;
  name: string;
  brand: string;
  unitPrice: number;
  imageUrl: string;
  locationText: string;
  x: number | null;
  y: number | null;
}

const RAW: RawItem[] = [
  {
    itemId: "205952637",
    brand: "DEWALT",
    name: "Black and Gold Drill Bit Set (14-Piece)",
    unitPrice: 14.97,
    imageUrl:
      "https://images.homedepot-static.com/productImages/0fe61d8e-48ec-4773-acce-915b7867d43e/svn/dewalt-twist-drill-bits-dwa1184-64_400.jpg",
    locationText: "Aisle 09, Bay 005",
    x: 226.2057708287155,
    y: 247.61979849227774,
  },
  {
    itemId: "308067442",
    brand: "DEWALT",
    name: "ATOMIC 20-Volt MAX Cordless Compact 1/2 in. Drill Driver Kit",
    unitPrice: 159.0,
    imageUrl:
      "https://images.homedepot-static.com/productImages/c6327a22-e931-482b-9d3e-aeab30caa4be/svn/dewalt-power-drills-dcd708c2-64_400.jpg",
    locationText: "Aisle 09, Bay 009",
    x: 226.2057708287155,
    y: 233.65274173548556,
  },
  {
    itemId: "100097524",
    brand: "DAP",
    name: "Alex Plus 10.1 oz. White Acrylic Latex Caulk Plus Silicone",
    unitPrice: 2.58,
    imageUrl:
      "https://images.homedepot-static.com/productImages/66016895-a1aa-445a-954f-8f75a0f7a6ed/svn/white-dap-caulk-18103-64_400.jpg",
    locationText: "Aisle 38, Bay 003",
    x: 253.11407419384574,
    y: 174.36693710882855,
  },
  {
    itemId: "303574493",
    brand: "EcoSmart",
    name: "60-Watt Equivalent A19 Non-Dimmable LED Light Bulb Daylight (8-Pack)",
    unitPrice: 9.94,
    imageUrl:
      "https://images.homedepot-static.com/productImages/9e5456cf-b653-4adf-9f8d-0db4548bbdb3/svn/ecosmart-led-light-bulbs-b7a19a60wul38-64_400.jpg",
    locationText: "Aisle 01, Bay 010",
    x: 304.38581383580714,
    y: 231.83376767470008,
  },
  {
    itemId: "100149185",
    brand: "3M",
    name: "Scotch 1.88 in. x 54.6 yds. Heavy-Duty Shipping Packaging Tape with Dispenser",
    unitPrice: 6.27,
    imageUrl:
      "https://images.homedepot-static.com/productImages/93552175-1709-44b0-8e1a-041a8e78a62c/svn/3m-adhesives-tape-3850-rd-dc-64_400.jpg",
    locationText: "Aisle 61, Bay 002",
    x: 325.8078270594234,
    y: 166.20040028201868,
  },
  {
    // Front-of-store / no interactive-map marker: routed as "grab at the front".
    itemId: "204406591",
    brand: "Energizer",
    name: "Rechargeable AA Batteries, NiMH, 2000 mAh, 4-Count",
    unitPrice: 10.98,
    imageUrl:
      "https://images.homedepot-static.com/productImages/92ffd374-b030-48fa-8322-542966d2e1a2/svn/energizer-aa-batteries-unh15bp-4-64_400.jpg",
    locationText: "Aisle C2, Bay 020",
    x: null,
    y: null,
  },
];

export const DEMO_STORE_ID = "1912";

/** Real entrance/register coordinates captured from the original run. */
export const DEMO_ENTRANCE: Pt = { x: 314, y: 304 };
export const DEMO_CHECKOUT: Pt = { x: 300, y: 304 };

export function getDemoCart(): LocatedItem[] {
  return RAW.map((r) => {
    const { aisle, bay } = parseLocation(r.locationText);
    return {
      itemId: r.itemId,
      name: r.name,
      brand: r.brand,
      qty: 1,
      unitPrice: r.unitPrice,
      imageUrl: r.imageUrl,
      productUrl: `https://www.homedepot.com/p/${r.itemId}`,
      locationText: r.locationText,
      aisle,
      bay,
      x: r.x,
      y: r.y,
      inStock: true,
    };
  });
}

import type { LocatedItem, RoutePoint, RouteResult } from "./types";
import { type Metric, type Pt, manhattan, pathCost, solveOpenPath } from "./salesman";

export interface PlanRouteOptions {
  /** Where the shopper starts. Defaults to the front-centre of the located items. */
  entrance?: Pt;
  /** Where the shopper ends (registers). Defaults to the entrance (front of store). */
  checkout?: Pt;
  metric?: Metric;
  seed?: number;
}

/**
 * Parse Home Depot's "Aisle 09, Bay 005" location label into tokens.
 * Front-of-store / seasonal locations like "Aisle C2, Bay 020" are preserved verbatim.
 */
export function parseLocation(locationText: string | null | undefined): {
  aisle: string | null;
  bay: string | null;
} {
  if (!locationText) return { aisle: null, bay: null };
  const aisleMatch = locationText.match(/Aisle\s*([A-Za-z]?\d+)/i);
  const bayMatch = locationText.match(/Bay\s*([A-Za-z]?\d+)/i);
  return {
    aisle: aisleMatch ? aisleMatch[1] : null,
    bay: bayMatch ? bayMatch[1] : null,
  };
}

function hasCoords(item: LocatedItem): item is LocatedItem & { x: number; y: number } {
  return typeof item.x === "number" && typeof item.y === "number";
}

/** Derive a sensible entrance/checkout at the front of the store (largest y in HD map space). */
function deriveFront(points: Pt[]): { entrance: Pt; checkout: Pt } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const span = maxX - minX || 1;
  // Entrance on the right of the storefront, registers on the left - a typical HD layout.
  return {
    entrance: { x: maxX, y: maxY + span * 0.08 },
    checkout: { x: minX, y: maxY + span * 0.08 },
  };
}

/**
 * Build the most efficient in-store route for a set of located cart items.
 *
 * Items without floor coordinates are returned separately in `unlocated` so the UI
 * can list them (e.g. "grab at the front" / special order) without breaking the path.
 */
export function planRoute(items: LocatedItem[], options: PlanRouteOptions = {}): RouteResult {
  const located = items.filter(hasCoords);
  const unlocated = items.filter((i) => !hasCoords(i));

  const waypoints: Pt[] = located.map((i) => ({ x: i.x as number, y: i.y as number }));

  // Establish start (entrance) and end (registers).
  let entrance = options.entrance;
  let checkout = options.checkout;
  if (!entrance || !checkout) {
    const reference = waypoints.length > 0 ? waypoints : [{ x: 0, y: 0 }];
    const front = deriveFront(reference);
    entrance = entrance ?? front.entrance;
    checkout = checkout ?? front.checkout;
  }

  const metric = options.metric ?? manhattan;
  const order = solveOpenPath(waypoints, entrance, checkout, { metric, seed: options.seed });

  const ordered: RoutePoint[] = [
    { x: entrance.x, y: entrance.y, label: "Entrance", kind: "entrance" },
    ...order.map((idx) => {
      const item = located[idx];
      return {
        x: item.x as number,
        y: item.y as number,
        label: item.locationText ?? item.name,
        kind: "item" as const,
        item,
      };
    }),
    { x: checkout.x, y: checkout.y, label: "Checkout", kind: "checkout" },
  ];

  const pathD =
    "M" +
    ordered
      .map((p) => `${round(p.x)},${round(p.y)}`)
      .join("L");

  const totalDistance = pathCost(order, waypoints, entrance, checkout, metric);

  return {
    ordered,
    pathD,
    totalDistance,
    viewBox: computeViewBox(ordered),
    unlocated,
  };
}

function computeViewBox(points: RoutePoint[]): RouteResult["viewBox"] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.12 + 12;
  const padY = (maxY - minY) * 0.12 + 12;
  return {
    minX: minX - padX,
    minY: minY - padY,
    width: maxX - minX + padX * 2,
    height: maxY - minY + padY * 2,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

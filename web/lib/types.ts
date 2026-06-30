/**
 * Response shape returned by the Python service (via the /api/plan proxy).
 * These are UI-facing types only; all routing/scraping logic lives in ../service.
 */

export type PointKind = "entrance" | "item" | "checkout";

export interface LocatedItem {
  itemId: string;
  name: string;
  brand?: string;
  qty: number;
  unitPrice?: number;
  imageUrl?: string;
  productUrl?: string;
  /** Identifiers for in-store scan-to-confirm (match a scanned barcode). */
  internetNumber?: string | null;
  storeSku?: string | null;
  modelNumber?: string | null;
  upc?: string | null;
  locationText: string | null;
  aisle: string | null;
  bay: string | null;
  x: number | null;
  y: number | null;
  inStock: boolean;
}

export interface RoutePoint {
  x: number;
  y: number;
  label: string;
  kind: PointKind;
  item?: LocatedItem;
}

export interface RouteResult {
  ordered: RoutePoint[];
  pathD: string;
  totalDistance: number;
  viewBox: { minX: number; minY: number; width: number; height: number };
  unlocated: LocatedItem[];
}

export interface PlanResult {
  storeId: string;
  items: LocatedItem[];
  route: RouteResult;
  /** The real Home Depot store-map SVG with the route + numbered pins injected. */
  mapSvg: string;
}

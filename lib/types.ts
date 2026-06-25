/** A product as it appears in a Home Depot cart, before we know where it lives in the store. */
export interface CartItem {
  itemId: string;
  name: string;
  brand?: string;
  qty: number;
  unitPrice?: number;
  imageUrl?: string;
  productUrl?: string;
}

/** A cart item enriched with its physical location in a specific store. */
export interface LocatedItem extends CartItem {
  /** Raw label as shown on the PDP, e.g. "Aisle 09, Bay 005". Null when not stocked on the floor. */
  locationText: string | null;
  /** Parsed aisle token, e.g. "09" or "C2". Null when unknown. */
  aisle: string | null;
  /** Parsed bay token, e.g. "005". Null when unknown. */
  bay: string | null;
  /** Store-map coordinates (Home Depot's interactive-map pixel space). Null when not mappable. */
  x: number | null;
  y: number | null;
  inStock: boolean;
}

export type PointKind = "entrance" | "item" | "checkout";

export interface RoutePoint {
  x: number;
  y: number;
  label: string;
  kind: PointKind;
  /** Present when kind === "item". */
  item?: LocatedItem;
}

export interface RouteResult {
  /** Visiting order, including the entrance (first) and checkout (last). */
  ordered: RoutePoint[];
  /** SVG path "d" attribute connecting the ordered points. */
  pathD: string;
  /** Total route distance in store-map units, using the chosen metric. */
  totalDistance: number;
  /** SVG viewBox tightly fit around all points (with padding). */
  viewBox: { minX: number; minY: number; width: number; height: number };
  /** Items in the cart that have no usable floor location (front-of-store, special order, OOS). */
  unlocated: LocatedItem[];
}

export interface PlanResult {
  storeId: string;
  source: "demo" | "live";
  items: LocatedItem[];
  route: RouteResult;
  /**
   * The real Home Depot store-map SVG with the route injected, in live mode.
   * Null in demo mode (and when the floor plan could not be captured), in which
   * case the UI falls back to the abstract grid renderer.
   */
  mapSvg?: string | null;
}

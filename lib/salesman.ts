/**
 * Open-path Traveling Salesman heuristic via simulated annealing.
 *
 * This is a TypeScript evolution of the original MERTH `salesman.js` (which was a
 * vendored copy of Ophir Lojkine's closed-loop solver). Two changes matter for a
 * real shopping trip:
 *
 *   1. Open path, not a loop. You enter at the front, snake through the aisles,
 *      and finish at the registers. The classic solver returns to the origin,
 *      which over-counts the walk back to the door.
 *   2. Pluggable distance metric. A store floor is a grid: you walk along aisles,
 *      not diagonally through shelving. Manhattan distance is a closer proxy than
 *      Euclidean, so it is the default here.
 */

export interface Pt {
  x: number;
  y: number;
}

export type Metric = (a: Pt, b: Pt) => number;

export const euclidean: Metric = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const manhattan: Metric = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export interface SolveOptions {
  metric?: Metric;
  /** Annealing cooling factor in (0,1). Closer to 1 = slower, better solutions. */
  coolingRate?: number;
  /** Deterministic seed for reproducible routes (optional). */
  seed?: number;
}

/** Small, dependency-free seeded PRNG (mulberry32) so routes can be reproducible. */
function makeRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cost of visiting `waypoints` in `order`, starting at `start` and ending at `end`. */
function pathCost(order: number[], waypoints: Pt[], start: Pt, end: Pt, metric: Metric): number {
  if (order.length === 0) return metric(start, end);
  let total = metric(start, waypoints[order[0]]);
  for (let i = 1; i < order.length; i++) {
    total += metric(waypoints[order[i - 1]], waypoints[order[i]]);
  }
  total += metric(waypoints[order[order.length - 1]], end);
  return total;
}

/** Greedy nearest-neighbour ordering, used as the annealing seed. */
function nearestNeighbour(waypoints: Pt[], start: Pt, metric: Metric): number[] {
  const remaining = waypoints.map((_, i) => i);
  const order: number[] = [];
  let cursor = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let k = 0; k < remaining.length; k++) {
      const d = metric(cursor, waypoints[remaining[k]]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = k;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    order.push(chosen);
    cursor = waypoints[chosen];
  }
  return order;
}

/**
 * Returns the order in which `waypoints` should be visited to minimise the total
 * walk from `start` through every waypoint to `end`.
 *
 * @returns an array of indices into `waypoints`.
 */
export function solveOpenPath(
  waypoints: Pt[],
  start: Pt,
  end: Pt,
  options: SolveOptions = {},
): number[] {
  const metric = options.metric ?? manhattan;
  const coolingRate = options.coolingRate ?? 0.9995;
  const rng = makeRng(options.seed);
  const n = waypoints.length;
  if (n <= 1) return waypoints.map((_, i) => i);

  let order = nearestNeighbour(waypoints, start, metric);
  let currentCost = pathCost(order, waypoints, start, end, metric);

  // Seed temperature off the scale of the problem so early moves are exploratory.
  let temperature = 100 * Math.max(metric(start, end), 1);
  while (temperature > 1e-6) {
    const i = Math.floor(rng() * n);
    const j = Math.floor(rng() * n);
    if (i !== j) {
      const candidate = order.slice();
      [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
      const candidateCost = pathCost(candidate, waypoints, start, end, metric);
      const delta = candidateCost - currentCost;
      if (delta < 0 || rng() < Math.exp(-delta / temperature)) {
        order = candidate;
        currentCost = candidateCost;
      }
    }
    temperature *= coolingRate;
  }
  return order;
}

export { pathCost };

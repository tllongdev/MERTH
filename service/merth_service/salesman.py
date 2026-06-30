"""Open-path Traveling Salesman heuristic via simulated annealing.

Ported from the TypeScript `salesman.ts` (itself an evolution of the original
MERTH `salesman.js`). Two choices matter for a real shopping trip:

1. Open path, not a loop. You enter at the front, snake through the aisles, and
   finish at the registers. The classic closed-loop solver over-counts the walk
   back to the door.
2. Pluggable distance metric. A store floor is a grid - you walk along aisles,
   not diagonally through shelving - so Manhattan distance is the default.
"""

from __future__ import annotations

import math
import random
from collections.abc import Callable

Point = tuple[float, float]
Metric = Callable[[Point, Point], float]


def euclidean(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def manhattan(a: Point, b: Point) -> float:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def path_cost(
    order: list[int],
    waypoints: list[Point],
    start: Point,
    end: Point,
    metric: Metric,
) -> float:
    """Cost of visiting `waypoints` in `order`, from `start` and ending at `end`."""
    if not order:
        return metric(start, end)
    total = metric(start, waypoints[order[0]])
    for i in range(1, len(order)):
        total += metric(waypoints[order[i - 1]], waypoints[order[i]])
    total += metric(waypoints[order[-1]], end)
    return total


def _nearest_neighbour(waypoints: list[Point], start: Point, metric: Metric) -> list[int]:
    """Greedy nearest-neighbour ordering, used as the annealing seed."""
    remaining = list(range(len(waypoints)))
    order: list[int] = []
    cursor = start
    while remaining:
        best_k = 0
        best_dist = math.inf
        for k, idx in enumerate(remaining):
            d = metric(cursor, waypoints[idx])
            if d < best_dist:
                best_dist = d
                best_k = k
        chosen = remaining.pop(best_k)
        order.append(chosen)
        cursor = waypoints[chosen]
    return order


def solve_open_path(
    waypoints: list[Point],
    start: Point,
    end: Point,
    *,
    metric: Metric = manhattan,
    cooling_rate: float = 0.9995,
    seed: int | None = None,
) -> list[int]:
    """Return the visiting order (indices into `waypoints`) that minimises the
    total walk from `start` through every waypoint to `end`."""
    rng = random.Random(seed)
    n = len(waypoints)
    if n <= 1:
        return list(range(n))

    order = _nearest_neighbour(waypoints, start, metric)
    current_cost = path_cost(order, waypoints, start, end, metric)

    temperature = 100 * max(metric(start, end), 1.0)
    while temperature > 1e-6:
        i = rng.randrange(n)
        j = rng.randrange(n)
        if i != j:
            candidate = order.copy()
            candidate[i], candidate[j] = candidate[j], candidate[i]
            candidate_cost = path_cost(candidate, waypoints, start, end, metric)
            delta = candidate_cost - current_cost
            if delta < 0 or rng.random() < math.exp(-delta / temperature):
                order = candidate
                current_cost = candidate_cost
        temperature *= cooling_rate
    return order

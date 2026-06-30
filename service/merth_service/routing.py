"""Route planning: parse aisle/bay, derive entrance/checkout, run the TSP solver,
and emit the SVG path + viewBox. Ported from the TypeScript `routing.ts`."""

from __future__ import annotations

import re

from .models import LocatedItem, RoutePoint, RouteResult, ViewBox
from .salesman import Metric, Point, manhattan, path_cost, solve_open_path

ROUTE_SEED = 42  # fixed seed -> reproducible routes for a given cart

_AISLE_RE = re.compile(r"Aisle\s*([A-Za-z]?\d+)", re.IGNORECASE)
_BAY_RE = re.compile(r"Bay\s*([A-Za-z]?\d+)", re.IGNORECASE)


def parse_location(location_text: str | None) -> tuple[str | None, str | None]:
    """Parse Home Depot's "Aisle 09, Bay 005" label into (aisle, bay) tokens."""
    if not location_text:
        return None, None
    aisle = _AISLE_RE.search(location_text)
    bay = _BAY_RE.search(location_text)
    return (aisle.group(1) if aisle else None, bay.group(1) if bay else None)


def _has_coords(item: LocatedItem) -> bool:
    return item.x is not None and item.y is not None


def _derive_front(points: list[Point]) -> tuple[Point, Point]:
    """Derive a sensible entrance/checkout at the front of the store (largest y
    in HD map space): entrance on the right, registers on the left."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, max_x, max_y = min(xs), max(xs), max(ys)
    span = (max_x - min_x) or 1.0
    entrance = (max_x, max_y + span * 0.08)
    checkout = (min_x, max_y + span * 0.08)
    return entrance, checkout


def _round(n: float) -> float:
    return round(n * 100) / 100


def _compute_view_box(points: list[RoutePoint]) -> ViewBox:
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad_x = (max_x - min_x) * 0.12 + 12
    pad_y = (max_y - min_y) * 0.12 + 12
    return ViewBox(
        min_x=min_x - pad_x,
        min_y=min_y - pad_y,
        width=max_x - min_x + pad_x * 2,
        height=max_y - min_y + pad_y * 2,
    )


def plan_route(
    items: list[LocatedItem],
    *,
    entrance: Point | None = None,
    checkout: Point | None = None,
    metric: Metric = manhattan,
    seed: int = ROUTE_SEED,
) -> RouteResult:
    """Build the most efficient in-store route for a set of located cart items.

    Items without floor coordinates are returned in `unlocated` so the UI can
    list them ("grab at the front" / special order) without breaking the path.
    """
    located = [i for i in items if _has_coords(i)]
    unlocated = [i for i in items if not _has_coords(i)]
    waypoints: list[Point] = [(i.x, i.y) for i in located]  # type: ignore[misc]

    if entrance is None or checkout is None:
        reference = waypoints if waypoints else [(0.0, 0.0)]
        derived_entrance, derived_checkout = _derive_front(reference)
        entrance = entrance or derived_entrance
        checkout = checkout or derived_checkout

    order = solve_open_path(waypoints, entrance, checkout, metric=metric, seed=seed)

    ordered: list[RoutePoint] = [
        RoutePoint(x=entrance[0], y=entrance[1], label="Entrance", kind="entrance"),
    ]
    for idx in order:
        item = located[idx]
        ordered.append(
            RoutePoint(
                x=item.x,  # type: ignore[arg-type]
                y=item.y,  # type: ignore[arg-type]
                label=item.location_text or item.name,
                kind="item",
                item=item,
            )
        )
    ordered.append(RoutePoint(x=checkout[0], y=checkout[1], label="Checkout", kind="checkout"))

    path_d = "M" + "L".join(f"{_round(p.x)},{_round(p.y)}" for p in ordered)
    total_distance = path_cost(order, waypoints, entrance, checkout, metric)

    return RouteResult(
        ordered=ordered,
        path_d=path_d,
        total_distance=total_distance,
        view_box=_compute_view_box(ordered),
        unlocated=unlocated,
    )

"""Orchestration: scrape -> optimize -> render the route onto the real map."""

from __future__ import annotations

from .models import PlanResult
from .routing import plan_route
from .scraper import scrape_store
from .svg import inject_route_into_map


def plan(cart_url: str, store_id: str) -> PlanResult:
    """The one and only mode.

    Read the cart, read each item's drop-pin (x, y) off the store-map SVG grid,
    optimize the visiting order, and draw the route + numbered pins back onto the
    captured floor plan. Fails loudly if the SVG could not be captured - without
    it there is no real map to show, which is the entire point.
    """
    items, store_map_svg = scrape_store(cart_url, store_id)

    if not items:
        raise ValueError("No items found in that cart (it may be empty, private, or expired).")
    if not store_map_svg:
        raise ValueError(
            "Could not capture the store-map SVG for this store. The whole route is "
            "plotted on that map, so there is nothing to show without it. (Usually means "
            "Home Depot's bot wall blocked the floor-plan request - retry, or set a "
            "residential proxy via MERTH_PROXY.)"
        )

    route = plan_route(items)
    map_svg = inject_route_into_map(store_map_svg, route)
    return PlanResult(store_id=store_id, items=items, route=route, map_svg=map_svg)

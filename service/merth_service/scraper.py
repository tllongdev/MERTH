"""Scrape Home Depot's interactive store map via the MerthBrowser engine.

WHY A SCRAPE (and not "an API"):
Home Depot exposes aisle/bay text, but there is NO public API for the store-map
geometry - the SVG floor plan or the per-product drop-pin (x, y). Those coordinates
are the only thing that lets us draw a real route on a real map, so we read them the
way the original 2020 build did: drive a (mobile) browser to each product's "Store
Map", read the `g.storemarker` `data-x`/`data-y`, and capture the store-map `<svg>`
as the render canvas.

The Akamai bypass + mobile store-map access live in browser.py; this module just
orchestrates cart -> per-item location -> SVG capture.
"""

from __future__ import annotations

from typing import Any

from .browser import MerthBrowser
from .config import settings
from .models import LocatedItem
from .routing import parse_location


def scrape_store(cart_url: str, store_id: str) -> tuple[list[LocatedItem], str | None]:
    """Return (located items, store-map SVG markup) for the given cart + store."""
    items: list[LocatedItem] = []
    store_map_svg: str | None = None

    with MerthBrowser(
        headless=settings.headless,
        timeout_ms=settings.timeout_ms,
    ) as browser:
        # Desktop: earn Akamai trust, read the cart, set the store.
        browser.warm()
        basics = browser.parse_cart(cart_url)
        browser.localize(store_id)

        # Mobile: the store-map UI only exists on the mobile site.
        browser.to_mobile()

        for base in basics:
            captured = browser.read_product(
                base["product_url"], capture_svg=store_map_svg is None
            )
            items.append(_to_located_item(base, captured))
            if store_map_svg is None and captured.get("svg"):
                store_map_svg = captured["svg"]

    return items, store_map_svg


def _to_located_item(base: dict[str, Any], captured: dict[str, Any]) -> LocatedItem:
    raw_loc = captured.get("location_text")
    location_text = raw_loc if isinstance(raw_loc, str) else None
    aisle, bay = parse_location(location_text)
    x = captured.get("x")
    y = captured.get("y")
    ids = captured.get("identifiers")
    if not isinstance(ids, dict):
        ids = {}
    item_id = str(base["item_id"])
    qty = base.get("qty", 1)

    return LocatedItem(
        item_id=item_id,
        name=str(captured.get("name") or base.get("name") or "Home Depot item"),
        qty=qty if isinstance(qty, int) else 1,
        image_url=_as_str(captured.get("image_url")),
        product_url=_as_str(base.get("product_url")),
        internet_number=ids.get("internet_number") or item_id,
        store_sku=ids.get("store_sku"),
        model_number=ids.get("model_number"),
        upc=ids.get("upc"),
        location_text=location_text,
        aisle=aisle,
        bay=bay,
        x=x if isinstance(x, float) else None,
        y=y if isinstance(y, float) else None,
        in_stock=isinstance(x, float) and isinstance(y, float),
    )


def _as_str(value: Any) -> str | None:
    return value if isinstance(value, str) else None

"""Scrape Home Depot's interactive store map with Scrapling's StealthyFetcher.

WHY A SCRAPE (and not "an API"):
Home Depot exposes aisle/bay *text*, but there is NO public API for the store-map
geometry - the SVG floor plan or the per-product drop-pin (x, y). Those
coordinates are the only thing that lets us draw a real route on a real map, so we
read them the way the original 2020 build did: drive a browser to each product's
"view on store map", read the `g.storemarker` `data-x`/`data-y`, and grab the
store-map `<svg>` itself as the render canvas.

WHY SCRAPLING:
The blocker is Akamai Bot Manager, not just stale selectors. A vanilla automated
browser is served a 403 "Error Page". Scrapling's StealthyFetcher runs a
de-fingerprinted (patchright) browser that patches CDP/WebRTC leaks, headless
tells, and canvas fingerprinting - which clears most bot walls outright. Akamai's
`_abck` sensor scoring on a hardened target may still flag a datacenter IP, so set
MERTH_PROXY to a residential proxy (config.py) and every request routes through it.

NOTE: The selectors below are inherited from the 2020 build. They cannot be
re-verified until we are reliably past Akamai; treat them as a starting point and
confirm against the live DOM. Every step degrades to "location unknown" for a
single item rather than aborting the whole run.
"""

from __future__ import annotations

import re
from typing import Any, cast

from scrapling.fetchers import StealthySession

from .config import settings
from .models import LocatedItem
from .routing import parse_location

_BASE = "https://www.homedepot.com"
_ITEM_ID_RE = re.compile(r"/(\d{6,})(?:[/?#]|$)")

# Product-identifier patterns, read off the PDP text for in-store scan-to-confirm.
# The shelf-tag barcode encodes HD's Internet #/Store SKU, so those are the
# reliable match targets; Model #/UPC are captured when present as a fallback.
_IDENTIFIER_RES = {
    "internet_number": re.compile(r"Internet\s*#?\s*(\d{6,})", re.IGNORECASE),
    "store_sku": re.compile(r"Store\s*SKU\s*#?\s*(\d{6,})", re.IGNORECASE),
    "model_number": re.compile(r"Model\s*#?\s*([A-Za-z0-9][A-Za-z0-9\-./]{2,})", re.IGNORECASE),
    "upc": re.compile(r"UPC\s*#?\s*(\d{11,14})", re.IGNORECASE),
}


def _extract_identifiers(text: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for key, pattern in _IDENTIFIER_RES.items():
        match = pattern.search(text)
        if match:
            found[key] = match.group(1).strip()
    return found

# VERIFY against the live site - original 2020 selectors as a starting point.
SELECTORS = {
    "cart_ready": "div.cartTotals",
    "cart_item": "div.cartItem",
    "item_brand": "h3.cartItem__brandName_mobile, h3.cartItem__brandName",
    "item_link": "div.cartImage > a",
    "item_qty": "input.cartItem__qtyInput",
    "store_map_link": "#store-availability > div > fieldset > div > a",
    "location_text": "a > .store-availability__content",
    "store_marker": "g.storemarker",
    "store_map_wrapper": ".storemap-wrapper",
}


def _abs_url(href: str) -> str:
    if not href:
        return ""
    if href.startswith("http"):
        return href
    if href.startswith("//"):
        return f"https:{href}"
    return f"{_BASE}{href}"


def _store_cookies(store_id: str) -> list[dict[str, str]]:
    # Pin the store up front - more robust than driving the store-picker chain.
    return [
        {
            "name": "THD_LOCALIZED_STORE_ID",
            "value": store_id,
            "domain": ".homedepot.com",
            "path": "/",
        }
    ]


def scrape_store(cart_url: str, store_id: str) -> tuple[list[LocatedItem], str | None]:
    """Return (located items, store-map SVG markup) for the given cart + store."""
    items: list[LocatedItem] = []
    store_map_svg: str | None = None
    cookies = _store_cookies(store_id)

    with StealthySession(
        headless=settings.headless,
        solve_cloudflare=True,
        block_webrtc=True,
        hide_canvas=True,
        timeout=settings.timeout_ms,
        proxy=settings.proxy,
        cookies=cast("Any", cookies),  # our dicts match Playwright's SetCookieParam shape
    ) as session:
        cart = session.fetch(
            cart_url,
            network_idle=True,
            wait_selector=SELECTORS["cart_ready"],
            wait_selector_state="attached",
        )
        cart_basics = _extract_cart_basics(cart)

        for base in cart_basics:
            located, captured_svg = _locate_item(session, base, store_map_svg is None)
            items.append(located)
            if store_map_svg is None and captured_svg:
                store_map_svg = captured_svg

    return items, store_map_svg


def _extract_cart_basics(cart: Any) -> list[dict[str, Any]]:
    """Read the cart DOM into a list of items with absolute product URLs."""
    basics: list[dict[str, Any]] = []
    for node in cart.css(SELECTORS["cart_item"]):
        anchor = node.css(SELECTORS["item_link"])
        href = anchor[0].attrib.get("href", "") if anchor else ""
        url = _abs_url(href)
        id_match = _ITEM_ID_RE.search(url)

        name_el = node.css(f'{SELECTORS["item_brand"]}::text')
        name = name_el.get() if name_el else None

        img = node.css("img")
        img_src = img[0].attrib.get("src") if img else None

        qty_el = node.css(SELECTORS["item_qty"])
        qty_raw = qty_el[0].attrib.get("value") if qty_el else None

        basics.append(
            {
                "item_id": id_match.group(1) if id_match else (url or "unknown"),
                "name": (name or "Unknown item").strip(),
                "qty": _safe_int(qty_raw, default=1),
                "image_url": img_src,
                "product_url": url or None,
            }
        )
    return basics


def _locate_item(
    session: StealthySession,
    base: dict[str, Any],
    want_svg: bool,
) -> tuple[LocatedItem, str | None]:
    """Visit a product page, read aisle/bay text, open the store map, read the pin
    (and capture the floor-plan SVG once)."""
    captured: dict[str, Any] = {}

    def read_map(page: Any) -> None:
        # Product identifiers (for in-store scan-to-confirm), read off the PDP text.
        try:
            captured["identifiers"] = _extract_identifiers(page.content() or "")
        except Exception:
            captured["identifiers"] = {}

        # Aisle/Bay label.
        loc_el = page.query_selector(SELECTORS["location_text"])
        if loc_el:
            captured["location_text"] = (loc_el.inner_text() or "").strip() or None

        # Open the interactive store map for this item, then read its drop pin.
        link = page.query_selector(SELECTORS["store_map_link"])
        if not link:
            return
        link.click()
        page.wait_for_selector(SELECTORS["store_marker"], timeout=settings.timeout_ms)
        marker = page.query_selector(SELECTORS["store_marker"])
        if marker:
            captured["x"] = _safe_float(marker.get_attribute("data-x"))
            captured["y"] = _safe_float(marker.get_attribute("data-y"))
        if want_svg:
            svg = page.query_selector(f'{SELECTORS["store_map_wrapper"]} svg')
            if svg:
                captured["svg"] = svg.evaluate("el => el.outerHTML")

    product_url = base.get("product_url")
    if product_url:
        try:
            session.fetch(product_url, network_idle=True, page_action=read_map)
        except Exception:
            # Leave location empty - item is surfaced as "grab at the front".
            pass

    location_text = captured.get("location_text")
    aisle, bay = parse_location(location_text)
    x = captured.get("x")
    y = captured.get("y")
    ids: dict[str, str] = captured.get("identifiers", {})

    item = LocatedItem(
        item_id=base["item_id"],
        name=base["name"],
        qty=base.get("qty", 1),
        image_url=base.get("image_url"),
        product_url=product_url,
        internet_number=ids.get("internet_number") or base["item_id"],
        store_sku=ids.get("store_sku"),
        model_number=ids.get("model_number"),
        upc=ids.get("upc"),
        location_text=location_text,
        aisle=aisle,
        bay=bay,
        x=x,
        y=y,
        in_stock=x is not None and y is not None,
    )
    return item, captured.get("svg")


def _safe_int(value: Any, *, default: int) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None

"""Generate the README example image.

Renders the REAL output of the app: a store floor-plan SVG with the cart's items
plotted as numbered pins and the most-efficient route (IN -> items -> PAY) drawn on
it, using the actual `plan_route` + `inject_route_into_map` pipeline. A live run
swaps in Home Depot's captured store-map SVG for the chosen store; the route /
pins / numbering are produced by the same code that runs in production.

Usage (from service/):
    uv run python scripts/gen_example_image.py
Writes ../docs/example-route.svg and ../docs/example-route.png
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # make merth_service importable

from merth_service.models import LocatedItem
from merth_service.routing import plan_route
from merth_service.svg import inject_route_into_map

DOCS = Path(__file__).resolve().parents[2] / "docs"

# A representative Home Depot-style floor plan (viewBox 0 0 900 600). Departments
# along the back wall, aisle runs through the middle, entrance bottom-right and
# registers bottom-left - the layout the route is drawn over.
BASE_MAP = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
  <rect x="0" y="0" width="900" height="600" fill="#f6f6f3"/>
  <rect x="24" y="24" width="852" height="552" rx="10" fill="#ffffff" stroke="#c9ccd3" stroke-width="3"/>

  <!-- back-wall departments -->
  <g font-family="sans-serif" font-size="15" fill="#7b7f88" text-anchor="middle">
    <rect x="44" y="44" width="150" height="86" rx="6" fill="#eef1f6"/><text x="119" y="92">Paint</text>
    <rect x="206" y="44" width="150" height="86" rx="6" fill="#eef1f6"/><text x="281" y="92">Hardware</text>
    <rect x="368" y="44" width="150" height="86" rx="6" fill="#eef1f6"/><text x="443" y="92">Plumbing</text>
    <rect x="530" y="44" width="150" height="86" rx="6" fill="#eef1f6"/><text x="605" y="92">Electrical</text>
    <rect x="692" y="44" width="160" height="86" rx="6" fill="#eef1f6"/><text x="772" y="92">Tools</text>
  </g>

  <!-- center aisle runs -->
  <g fill="#dde0e6">
    <rect x="120" y="180" width="40" height="240" rx="5"/>
    <rect x="250" y="180" width="40" height="240" rx="5"/>
    <rect x="380" y="180" width="40" height="240" rx="5"/>
    <rect x="510" y="180" width="40" height="240" rx="5"/>
    <rect x="640" y="180" width="40" height="240" rx="5"/>
  </g>
  <g font-family="sans-serif" font-size="13" fill="#9aa0ab" text-anchor="middle">
    <text x="140" y="170">A4</text><text x="270" y="170">A9</text><text x="400" y="170">A14</text>
    <text x="530" y="170">A21</text><text x="660" y="170">A27</text>
  </g>

  <!-- right-side bulk / lumber + garden -->
  <rect x="720" y="180" width="132" height="150" rx="6" fill="#eef1f6"/>
  <rect x="720" y="350" width="132" height="120" rx="6" fill="#eaf3ea"/>
  <g font-family="sans-serif" font-size="15" fill="#7b7f88" text-anchor="middle">
    <text x="786" y="260">Lumber</text><text x="786" y="415">Garden</text>
  </g>

  <!-- storefront labels -->
  <g font-family="sans-serif" font-size="13" fill="#9aa0ab" text-anchor="middle">
    <text x="120" y="566">Registers</text><text x="800" y="566">Entrance</text>
  </g>
</svg>"""


def main() -> None:
    # A sample 6-item cart, with coordinates in the map's own grid (what the
    # scraper reads off Home Depot's drop pins).
    items = [
        _item("1001", "BEHR", "Premium Plus Paint, 1 gal", 119, 150),
        _item("1002", "Husky", "Adjustable Wrench Set", 281, 230),
        _item("1003", "SharkBite", '1/2 in. Push Coupling', 443, 165),
        _item("1004", "Leviton", "Decora Wall Switch", 605, 300),
        _item("1005", "DEWALT", "20V Drill / Driver Kit", 772, 230),
        _item("1006", "2x4", "Premium Stud (8 ft)", 786, 415),
    ]
    entrance = (800, 540)
    checkout = (120, 540)

    route = plan_route(items, entrance=entrance, checkout=checkout)
    final_svg = inject_route_into_map(BASE_MAP, route)

    DOCS.mkdir(parents=True, exist_ok=True)
    svg_path = DOCS / "example-route.svg"
    svg_path.write_text(final_svg, encoding="utf-8")
    print(f"wrote {svg_path}")

    _render_png(final_svg, DOCS / "example-route.png")


def _item(item_id: str, brand: str, name: str, x: float, y: float) -> LocatedItem:
    return LocatedItem(
        item_id=item_id,
        name=name,
        brand=brand,
        qty=1,
        location_text=None,
        x=x,
        y=y,
        in_stock=True,
    )


def _render_png(svg: str, out: Path) -> None:
    """Render the SVG to a crisp PNG with Playwright (already installed for Scrapling)."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception as err:  # noqa: BLE001
        print(f"[skip png] Playwright unavailable: {err}")
        return

    html = (
        '<!doctype html><html><head><meta charset="utf-8">'
        "<style>html,body{margin:0;padding:0;background:#0c0d10}"
        "#wrap{width:900px;padding:16px;background:#0c0d10}"
        "svg{width:900px;height:600px;display:block;border-radius:12px;background:#fff}"
        "</style></head><body>"
        f'<div id="wrap">{svg}</div></body></html>'
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=2)
        page.set_content(html, wait_until="networkidle")
        page.locator("#wrap").screenshot(path=str(out))
        browser.close()
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

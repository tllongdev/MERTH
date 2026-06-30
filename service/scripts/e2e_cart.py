"""End-to-end from a REAL cart: parse_cart -> locate each item -> route on real map.

Exercises the exact production flow (scraper.scrape_store) but against a live cart.
Pass a shared-cart URL as argv[1], or omit to use the logged-in /cart of the dbg
Chrome profile (the one cart_test.py populates). Produces .scratch/e2e_cart.(svg|png).

Run (from service/):  PYTHONPATH=. uv run python scripts/e2e_cart.py [cart_url]
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from patchright.sync_api import sync_playwright  # noqa: E402

from merth_service.browser import MerthBrowser  # noqa: E402
from merth_service.routing import plan_route  # noqa: E402
from merth_service.scraper import _to_located_item  # noqa: E402
from merth_service.svg import inject_route_into_map  # noqa: E402

SCRATCH = Path(__file__).resolve().parents[1] / ".scratch"
STORE = "1912"
CART_URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.homedepot.com/cart"


def _render(svg: str, out_png: Path) -> None:
    html = f'<html><body style="margin:0;background:#fff">{svg}</body></html>'
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page(viewport={"width": 1400, "height": 900})
        pg.set_content(html)
        pg.wait_for_timeout(300)
        pg.locator("svg").first.screenshot(path=str(out_png))
        b.close()


def main() -> None:
    SCRATCH.mkdir(parents=True, exist_ok=True)
    located = []
    store_map_svg: str | None = None

    with MerthBrowser(headless=False, port=9344,
                      profile_dir=str(Path.home() / ".merth-chrome-dbg")) as browser:
        browser.warm()
        basics = browser.parse_cart(CART_URL)
        print(f"[e2e] cart -> {len(basics)} items: {[b['item_id'] for b in basics]}")
        browser.localize(STORE)
        browser.to_mobile()

        for base in basics:
            captured = browser.read_product(base["product_url"],
                                            capture_svg=store_map_svg is None)
            item = _to_located_item(base, captured)
            located.append(item)
            xy = f"({item.x:.0f},{item.y:.0f})" if item.x is not None else "(no-loc)"
            print(f"[e2e] {item.item_id} {item.name[:38]!r} {xy} {item.location_text}")
            if store_map_svg is None and captured.get("svg"):
                store_map_svg = captured["svg"]

    placed = [i for i in located if i.x is not None and i.y is not None]
    print(f"[e2e] {len(placed)}/{len(located)} items placed; svg={store_map_svg is not None}")
    if not placed or not store_map_svg:
        print("[e2e] FAILED to gather located items + map")
        return

    route = plan_route(placed)
    final_svg = inject_route_into_map(store_map_svg, route)
    (SCRATCH / "e2e_cart.svg").write_text(final_svg, encoding="utf-8")
    _render(final_svg, SCRATCH / "e2e_cart.png")
    print(f"[e2e] total_distance={route.total_distance:.0f}; wrote .scratch/e2e_cart.(svg|png)")
    for i, pt in enumerate(route.ordered):
        print(f"   {i}: {pt.kind:8} {pt.label[:42]}")


if __name__ == "__main__":
    main()

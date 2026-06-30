"""End-to-end demo: real #1912 map + real in-stock items + optimized route, rendered.

Drives the production engine (browser.py / scraper.py / routing / svg) the same way
the /plan endpoint does, but gathers items from a few searches (so we have real
in-stock SKUs without needing a private shared-cart URL). Produces:
  .scratch/e2e_route.svg  - the real store map with the route + numbered pins
  .scratch/e2e_route.png  - a rendered preview

Run (from service/):  PYTHONPATH=. uv run python scripts/e2e_demo.py
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
SEARCH_TERMS = ["wood screws", "led light bulb", "gorilla glue", "paint roller"]
TARGET_ITEMS = 5


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

    with MerthBrowser(headless=False) as browser:
        browser.warm()
        browser.localize("1912")
        browser.to_mobile()

        for term in SEARCH_TERMS:
            if len(located) >= TARGET_ITEMS:
                break
            for pid in browser.find_instock_products(term, limit=4):
                if len(located) >= TARGET_ITEMS:
                    break
                base = {"item_id": pid, "product_url": f"https://www.homedepot.com/p/{pid}", "qty": 1}
                captured = browser.read_product(base["product_url"],
                                                capture_svg=store_map_svg is None)
                item = _to_located_item(base, captured)
                if item.x is not None and item.y is not None:
                    located.append(item)
                    print(f"[e2e] located {item.name[:40]!r} @ ({item.x:.0f},{item.y:.0f}) "
                          f"{item.location_text}")
                if store_map_svg is None and captured.get("svg"):
                    store_map_svg = captured["svg"]

    print(f"[e2e] located {len(located)} items; svg captured={store_map_svg is not None}")
    if not located or not store_map_svg:
        print("[e2e] FAILED to gather items + map")
        return

    route = plan_route(located)
    final_svg = inject_route_into_map(store_map_svg, route)
    (SCRATCH / "e2e_route.svg").write_text(final_svg, encoding="utf-8")
    _render(final_svg, SCRATCH / "e2e_route.png")
    print(f"[e2e] total_distance={route.total_distance:.0f}; wrote .scratch/e2e_route.(svg|png)")
    for i, pt in enumerate(route.ordered):
        print(f"   {i}: {pt.kind:8} {pt.label[:42]}")


if __name__ == "__main__":
    main()

"""Verify parse_cart against a REAL Home Depot cart.

Builds a cart in-session (add a few in-stock items), then runs parse_cart on the
live /cart page and checks the same product IDs come back. Also accepts an explicit
shared-cart URL via argv[1] to test a user-provided cart.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from merth_service.browser import MerthBrowser  # noqa: E402

STORE = "1912"
CART_URL = "https://www.homedepot.com/cart"


def _add_to_cart(b: MerthBrowser, pid: str) -> bool:
    b.page.goto(f"https://www.homedepot.com/p/{pid}",
                wait_until="domcontentloaded", timeout=60000)
    b.page.wait_for_timeout(2500)
    for _ in range(3):
        b.page.mouse.wheel(0, 700)
        b.page.wait_for_timeout(400)
    for sel in ("button:has-text('Add to Cart')", "button:has-text('Add to cart')"):
        try:
            b.page.locator(sel).first.click(timeout=4000)
            b.page.wait_for_timeout(2500)
            return True
        except Exception:
            continue
    return False


def main() -> None:
    explicit = sys.argv[1] if len(sys.argv) > 1 else None
    with MerthBrowser(headless=False, port=9344,
                      profile_dir=str(Path.home() / ".merth-chrome-dbg")) as b:
        b.warm()
        b.localize(STORE)

        if explicit:
            print(f"[cart] parsing explicit cart url: {explicit}")
            items = b.parse_cart(explicit)
            print(f"[cart] extracted {len(items)} items: "
                  f"{[i['item_id'] for i in items]}")
            return

        ids = b.find_instock_products("wood screws", limit=3)
        print(f"[cart] candidate product ids: {ids}")
        added = [pid for pid in ids if _add_to_cart(b, pid)]
        print(f"[cart] added to cart: {added}")

        items = b.parse_cart(CART_URL)
        got = [i["item_id"] for i in items]
        print(f"[cart] parse_cart returned {len(items)} items: {got}")
        hit = [pid for pid in added if pid in got]
        print(f"[cart] matched {len(hit)}/{len(added)} added items: {hit}")


if __name__ == "__main__":
    main()

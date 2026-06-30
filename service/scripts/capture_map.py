"""Fully automated capture of the #1912 store-map.

Hard-won sequence (every other combo fails):
  * A cold/automated MOBILE context is 403'd by Akamai and _abck never validates.
  * A real DESKTOP Chrome session DOES pass and validates _abck.
  * So: warm + localize in desktop, then flip the SAME validated live session to
    Chrome-Android mobile via CDP (Emulation.*) - the mobile PDP then loads 200 and
    HD serves the mobile store-map UI. The session stays trusted across the flip.

The aisle + store-map only exist for items IN STOCK at the store, so we search a
common item and probe results until one has an aisle, then open its map overlay.

Run (from service/):  PYTHONPATH=. uv run python scripts/capture_map.py
"""

from __future__ import annotations

import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from patchright.sync_api import sync_playwright  # noqa: E402

SCRATCH = Path(__file__).resolve().parents[1] / ".scratch"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE = str(Path.home() / ".merth-chrome")
PORT = 9222
HOME = "https://www.homedepot.com/"
STORE = "https://www.homedepot.com/l/North-Avenue/IL/Chicago/60642/1912"
SEARCH = "https://www.homedepot.com/s/wood%20screws"
NA_LAT, NA_LNG = 41.9106, -87.6705  # North Avenue, Chicago (store #1912 / ZIP 60642)
ANDROID_UA = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
)
TOKENS = ["storemap", "store-map", "storemarker", "StoreMap", "MapView", "data-x",
          "data-y", "viewBox", "Aisle", "Bay", "1912", "North Avenue", "store map"]


def _launch_chrome() -> subprocess.Popen:
    proc = subprocess.Popen(
        [CHROME, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
         "--no-first-run", "--no-default-browser-check", HOME],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(40):
        try:
            urllib.request.urlopen(f"http://localhost:{PORT}/json/version", timeout=1)
            return proc
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("Chrome CDP endpoint never came up")


def _abck(context) -> str:  # type: ignore[no-untyped-def]
    for c in context.cookies():
        if c.get("name") == "_abck":
            return str(c.get("value", ""))
    return ""


def _to_mobile(page) -> None:  # type: ignore[no-untyped-def]
    """Flip this live (already-trusted) session to Chrome-Android mobile, landscape."""
    client = page.context.new_cdp_session(page)
    client.send("Emulation.setDeviceMetricsOverride", {
        "width": 915, "height": 412, "deviceScaleFactor": 3, "mobile": True,
        "screenOrientation": {"type": "landscapePrimary", "angle": 90},
    })
    client.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    client.send("Emulation.setUserAgentOverride", {
        "userAgent": ANDROID_UA,
        "acceptLanguage": "en-US",
        "userAgentMetadata": {
            "brands": [{"brand": "Chromium", "version": "126"},
                       {"brand": "Google Chrome", "version": "126"},
                       {"brand": "Not.A/Brand", "version": "24"}],
            "fullVersion": "126.0.0.0", "platform": "Android", "platformVersion": "14.0.0",
            "architecture": "", "model": "Pixel 8", "mobile": True,
        },
    })


def main() -> None:
    SCRATCH.mkdir(parents=True, exist_ok=True)
    proc = _launch_chrome()
    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(f"http://localhost:{PORT}")
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.pages[0] if context.pages else context.new_page()

            # Force geolocation to North Avenue so HD localizes to store #1912.
            try:
                context.grant_permissions(["geolocation"], origin="https://www.homedepot.com")
            except Exception:
                pass
            context.new_cdp_session(page).send(
                "Emulation.setGeolocationOverride",
                {"latitude": NA_LAT, "longitude": NA_LNG, "accuracy": 40})

            # 1) DESKTOP warm (native fingerprint) so Akamai validates _abck.
            page.goto(HOME, wait_until="domcontentloaded", timeout=60000)
            for sel in ("#onetrust-accept-btn-handler", "button:has-text('Accept')"):
                try:
                    page.locator(sel).first.click(timeout=2500)
                    break
                except Exception:
                    pass
            for i in range(18):
                page.mouse.move(80 + i * 37 % 800, 70 + i * 19 % 330)
                if i % 3 == 0:
                    page.mouse.wheel(0, 400)
                page.wait_for_timeout(700)
                if _abck(context) and "~-1~" not in _abck(context):
                    break
            print(f"[capture] _abck after warm: {_abck(context)[:36]!r}")

            # 2) DESKTOP localize: set North Avenue #1912 as my store.
            r = page.goto(STORE, wait_until="domcontentloaded", timeout=60000)
            print(f"[capture] store status={r.status if r else '?'}")
            page.wait_for_timeout(2500)
            set_store = None
            for sel in ("button:has-text('Set as My Store')", "text=/set as my store/i",
                        "text=/make this my store/i", "text=/shop this store/i"):
                try:
                    page.locator(sel).first.click(timeout=3000)
                    set_store = sel
                    break
                except Exception:
                    pass
            print(f"[capture] set-as-my-store clicked: {set_store!r}")
            page.wait_for_timeout(2000)

            # 3) FLIP the trusted session to mobile and confirm it's really mobile.
            _to_mobile(page)
            page.goto(SEARCH, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2500)
            print(f"[capture] after flip: innerWidth={page.evaluate('innerWidth')} "
                  f"uaMobile={page.evaluate('navigator.userAgentData?.mobile')} "
                  f"ua={page.evaluate('navigator.userAgent')[:48]!r}")

            ids: list[str] = []
            for pid in re.findall(r"/p/(?:[^\"']*?/)?(\d{7,})", page.content() or ""):
                if pid not in ids:
                    ids.append(pid)
            print(f"[capture] candidate products: {ids[:10]}")

            # 4) Probe products until one is stocked at this store (has an aisle).
            aisle_re = re.compile(r"Aisle\s*\d+", re.I)
            found = None
            for pid in ids[:10]:
                page.goto(f"https://www.homedepot.com/p/{pid}",
                          wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(3000)
                page.mouse.wheel(0, 900)
                page.wait_for_timeout(1500)
                try:
                    page.get_by_text(aisle_re).first.wait_for(timeout=3500)
                    found = pid
                    break
                except Exception:
                    continue
            print(f"[capture] in-stock product with aisle: {found!r}")

            if found:
                page.screenshot(path=str(SCRATCH / "capture_pdp.png"), full_page=True)
                # 5) Tap the Aisle/store-map control to open the map overlay.
                opened = None
                for sel in ("text=/view on store map/i", "text=/store map/i",
                            "text=/view map/i", "text=/aisle\\s*\\d/i",
                            "[data-component*='StoreMap']"):
                    try:
                        page.locator(sel).first.click(timeout=3000)
                        opened = sel
                        break
                    except Exception:
                        pass
                page.wait_for_timeout(4000)
                print(f"[capture] map opener clicked: {opened!r}")

            html = page.content() or ""
            (SCRATCH / "capture_pdp.html").write_text(html, encoding="utf-8")
            page.screenshot(path=str(SCRATCH / "capture_map.png"), full_page=True)

        print(f"[capture] html {len(html):,} bytes")
        for t in TOKENS:
            print(f"  {t:<16} count={html.lower().count(t.lower())}")
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()

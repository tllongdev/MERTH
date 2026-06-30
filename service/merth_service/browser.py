"""Home Depot browser engine - the proven path past Akamai to the mobile store-map.

The hard-won recipe (every other combination is 403'd):

1. Launch a real Chrome with a persistent profile and attach over CDP.
2. WARM + accept cookies in DESKTOP mode so Akamai validates the `_abck` sensor
   cookie (a cold/automated *mobile* context never validates and is blocked).
3. LOCALIZE the target store (spoof geolocation + click "Set as My Store").
4. FLIP the same, now-trusted, live session to Chrome-for-Android mobile via the
   CDP Emulation domain. The store-map UI only exists on mobile, and the session
   stays trusted across the flip.
5. On each product page, tap "Store Map" and read the `g.storemarker` `data-x`/
   `data-y` drop-pin + capture the `<svg title="Store layout for ...">` floor plan.

This is exactly how the original 2020 Puppeteer build worked, updated for 2026
Akamai. See scripts/capture_map.py for the standalone proof.
"""

from __future__ import annotations

import re
import subprocess
import time
import urllib.request
from pathlib import Path
from types import TracebackType
from typing import Any

from patchright.sync_api import sync_playwright

_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
_HOME = "https://www.homedepot.com/"
_ANDROID_UA = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
)

# `https://www.homedepot.com/l/<storeId>` 301-resolves to the canonical store page
# for ANY id (e.g. /l/1912 -> /l/North-Avenue/IL/Chicago/60642/1912), so localization
# is fully generic - no per-store table or API key needed. We still extract coords
# from the resolved page for the geolocation hint; this dict is only a fallback in
# case that parse fails for a given store.
_STORE_BY_ID = "https://www.homedepot.com/l/{store_id}"
_COORDS_HINT: dict[str, tuple[float, float]] = {
    "1912": (41.9106, -87.6705),
}
_COORDS_RES = (
    re.compile(r'"lat(?:itude)?"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"l(?:ng|ongitude)"\s*:\s*(-?\d{1,3}\.\d+)'),
    re.compile(r'"l(?:ng|ongitude)"\s*:\s*(-?\d{1,3}\.\d+)\s*,\s*"lat(?:itude)?"\s*:\s*(-?\d{1,2}\.\d+)'),
)

_ITEM_ID_RE = re.compile(r"/p/(?:[^\"']*?/)?(\d{6,})")
_AISLE_BAY_RE = re.compile(r"Aisle\s*[A-Za-z]?\d+\s*[,|]?\s*Bay\s*#?\s*[A-Za-z]?\d+", re.IGNORECASE)

_IDENTIFIER_RES = {
    "internet_number": re.compile(r"Internet\s*#?\s*(\d{6,})", re.IGNORECASE),
    "store_sku": re.compile(r"Store\s*SKU\s*#?\s*(\d{6,})", re.IGNORECASE),
    "model_number": re.compile(r"Model\s*#?\s*([A-Za-z0-9][A-Za-z0-9\-./]{2,})", re.IGNORECASE),
    "upc": re.compile(r"UPC\s*#?\s*(\d{11,14})", re.IGNORECASE),
}


class MerthBrowser:
    """Context manager that owns the Chrome process + a localized, mobile session."""

    def __init__(
        self,
        *,
        headless: bool = False,
        profile_dir: str | None = None,
        port: int = 9222,
        timeout_ms: int = 60000,
    ) -> None:
        self._headless = headless
        self._profile = profile_dir or str(Path.home() / ".merth-chrome")
        self._port = port
        self._timeout = timeout_ms
        self._proc: subprocess.Popen[bytes] | None = None
        self._pw: Any = None
        self._browser: Any = None
        self.context: Any = None
        self.page: Any = None

    # -- lifecycle ---------------------------------------------------------------
    def __enter__(self) -> MerthBrowser:
        self._launch_chrome()
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.connect_over_cdp(f"http://localhost:{self._port}")
        self.context = self._browser.contexts[0] if self._browser.contexts else self._browser.new_context()
        self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
        return self

    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None,
                 tb: TracebackType | None) -> None:
        try:
            if self._pw is not None:
                self._pw.stop()
        finally:
            if self._proc is not None:
                self._proc.terminate()

    def _launch_chrome(self) -> None:
        args = [_CHROME, f"--remote-debugging-port={self._port}",
                f"--user-data-dir={self._profile}", "--no-first-run",
                "--no-default-browser-check"]
        if self._headless:
            args.append("--headless=new")
        args.append(_HOME)
        self._proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(40):
            try:
                urllib.request.urlopen(f"http://localhost:{self._port}/json/version", timeout=1)
                return
            except Exception:
                time.sleep(0.5)
        raise RuntimeError("Chrome CDP endpoint never came up")

    # -- Akamai handshake --------------------------------------------------------
    def _abck(self) -> str:
        for c in self.context.cookies():
            if c.get("name") == "_abck":
                return str(c.get("value", ""))
        return ""

    def warm(self) -> None:
        """Desktop warm-up: accept cookies + human-like activity until _abck validates."""
        self.page.goto(_HOME, wait_until="domcontentloaded", timeout=self._timeout)
        for sel in ("#onetrust-accept-btn-handler", "button:has-text('Accept')"):
            try:
                self.page.locator(sel).first.click(timeout=2500)
                break
            except Exception:
                pass
        for i in range(18):
            self.page.mouse.move(80 + i * 37 % 800, 70 + i * 19 % 330)
            if i % 3 == 0:
                self.page.mouse.wheel(0, 400)
            self.page.wait_for_timeout(700)
            v = self._abck()
            if v and "~-1~" not in v:
                break

    def localize(self, store_id: str) -> None:
        """Set any store as 'my store' (generic /l/<id> resolve + geo hint + click)."""
        try:
            self.context.grant_permissions(["geolocation"], origin="https://www.homedepot.com")
        except Exception:
            pass

        # /l/<id> redirects to the canonical store page for any store id.
        self.page.goto(_STORE_BY_ID.format(store_id=store_id),
                       wait_until="domcontentloaded", timeout=self._timeout)
        self.page.wait_for_timeout(2500)

        # Geolocation hint so HD doesn't snap back to the IP-nearest store: prefer the
        # store's own coords (parsed from the resolved page), fall back to the table.
        coords = self._extract_coords() or _COORDS_HINT.get(store_id)
        if coords:
            try:
                self.context.new_cdp_session(self.page).send(
                    "Emulation.setGeolocationOverride",
                    {"latitude": coords[0], "longitude": coords[1], "accuracy": 40})
            except Exception:
                pass

        for sel in ("button:has-text('Set as My Store')", "text=/set as my store/i",
                    "text=/make this my store/i", "text=/shop this store/i"):
            try:
                self.page.locator(sel).first.click(timeout=3000)
                break
            except Exception:
                pass
        self.page.wait_for_timeout(2000)

    def _extract_coords(self) -> tuple[float, float] | None:
        """Pull (lat, lng) out of the resolved store page's embedded JSON."""
        try:
            html = self.page.content() or ""
        except Exception:
            return None
        for i, rx in enumerate(_COORDS_RES):
            m = rx.search(html)
            if m:
                a, b = float(m.group(1)), float(m.group(2))
                lat, lng = (a, b) if i == 0 else (b, a)
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return (lat, lng)
        return None

    def to_mobile(self) -> None:
        """Flip the trusted live session to Chrome-Android mobile (landscape) via CDP."""
        client = self.context.new_cdp_session(self.page)
        client.send("Emulation.setDeviceMetricsOverride", {
            "width": 915, "height": 412, "deviceScaleFactor": 3, "mobile": True,
            "screenOrientation": {"type": "landscapePrimary", "angle": 90},
        })
        client.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        client.send("Emulation.setUserAgentOverride", {
            "userAgent": _ANDROID_UA, "acceptLanguage": "en-US",
            "userAgentMetadata": {
                "brands": [{"brand": "Chromium", "version": "126"},
                           {"brand": "Google Chrome", "version": "126"},
                           {"brand": "Not.A/Brand", "version": "24"}],
                "fullVersion": "126.0.0.0", "platform": "Android",
                "platformVersion": "14.0.0", "architecture": "", "model": "Pixel 8",
                "mobile": True,
            },
        })

    # -- data extraction ---------------------------------------------------------
    def read_product(self, product_url: str, *, capture_svg: bool = False) -> dict[str, Any]:
        """Open a PDP (mobile), tap Store Map, read the drop-pin + aisle/bay + ids.

        Returns {x, y, location_text, identifiers, svg?}. Missing keys mean the item
        is not stocked/located at this store (degrade to 'grab at the front')."""
        out: dict[str, Any] = {}
        try:
            self.page.goto(product_url, wait_until="domcontentloaded", timeout=self._timeout)
        except Exception:
            return out
        self.page.wait_for_timeout(3000)
        for _ in range(4):
            self.page.mouse.wheel(0, 900)
            self.page.wait_for_timeout(700)

        body_text = ""
        try:
            body_text = self.page.inner_text("body") or ""
        except Exception:
            pass
        out["identifiers"] = {k: m.group(1).strip() for k, p in _IDENTIFIER_RES.items()
                              if (m := p.search(body_text))}
        loc = _AISLE_BAY_RE.search(body_text)
        if loc:
            out["location_text"] = re.sub(r"\s+", " ", loc.group(0)).strip()

        # Product name + image (the PDP is the most reliable source for these).
        try:
            h1 = self.page.query_selector("h1")
            if h1:
                out["name"] = (h1.inner_text() or "").strip() or None
        except Exception:
            pass
        try:
            img = self.page.query_selector("img[src*='images.thdstatic.com']")
            if img:
                out["image_url"] = img.get_attribute("src")
        except Exception:
            pass

        # The aisle/store-map control only exists for items stocked at this store, and
        # it must be hydrated before its click handler works. Wait for the aisle text
        # (the signal that the store-availability section is live) before tapping.
        try:
            self.page.get_by_text(re.compile(r"Aisle\s*\d+", re.I)).first.wait_for(timeout=7000)
        except Exception:
            return out  # not stocked / no location at this store - grab at the front

        # Clicking the aisle primes the store-availability map first; then the
        # "Store Map" button opens the overlay (this mirrors the manual flow that
        # reliably populates the pin).
        try:
            self.page.get_by_text(re.compile(r"Aisle\s*\d+", re.I)).first.click(timeout=3000)
            self.page.wait_for_timeout(1500)
        except Exception:
            pass

        # Use role/text locators (which target the actual button), NOT the `text=`
        # engine - that also matches wrapping ancestors, so `.first` can click an
        # outer container that never fires the open handler.
        _map_re = re.compile(r"store map", re.I)
        openers = (
            self.page.get_by_role("button", name=_map_re),
            self.page.get_by_role("link", name=_map_re),
            self.page.get_by_text(_map_re),
        )
        for opener in openers:
            try:
                opener.first.click(timeout=3000)
                break
            except Exception:
                pass

        # The marker renders in two phases: a placeholder <g class="storemarker">
        # first, then the data-x/data-y coordinate is populated once the floor plan
        # loads. Poll for the POPULATED marker rather than the placeholder.
        for _ in range(20):
            self.page.wait_for_timeout(1000)
            g = self.page.query_selector("g.storemarker[data-x]")
            if g:
                x = _safe_float(g.get_attribute("data-x"))
                y = _safe_float(g.get_attribute("data-y"))
                if x is not None and y is not None:
                    out["x"], out["y"] = x, y
                    break
        if out.get("x") is None:
            return out
        if capture_svg:
            svg = self.page.query_selector("svg[title^='Store layout']") or \
                self.page.query_selector(".storemap-wrapper svg") or \
                self.page.query_selector("g.storemarker >> xpath=ancestor::svg")
            if svg:
                try:
                    # Fit the viewBox to the rendered content and drop the fixed
                    # width/height so the map is self-contained and responsive (the
                    # raw SVG has width/height but no viewBox, clipping the floor plan).
                    out["svg"] = svg.evaluate(
                        "el => { try { const b = el.getBBox(); const p = 24;"
                        " el.setAttribute('viewBox', (b.x-p)+' '+(b.y-p)+' '+"
                        "(b.width+2*p)+' '+(b.height+2*p));"
                        " el.removeAttribute('width'); el.removeAttribute('height');"
                        " el.setAttribute('preserveAspectRatio','xMidYMid meet'); }"
                        " catch(e){} return el.outerHTML; }"
                    )
                except Exception:
                    pass
            # Drop this product's own drop-pin from the canvas - our route overlay
            # draws all stops; a stray single pin would be confusing.
            out["svg"] = _strip_storemarker(out.get("svg"))
        return out

    def parse_cart(self, cart_url: str) -> list[dict[str, Any]]:
        """Read a Home Depot cart (or shared-cart) page into product basics.

        Done in desktop mode before the mobile flip. We scope to the cart's line-item
        components (`cart-item:CartItem:*`) and read each item's `/p/<id>` link + real
        quantity - this deliberately EXCLUDES the "recommended" / "frequently bought"
        carousels, which otherwise dump dozens of unrelated product links into the
        cart. Names/images are filled in later from each product page. Falls back to a
        whole-page /p/ regex only if the scoped query finds nothing (unknown layout).
        """
        try:
            self.page.goto(cart_url, wait_until="domcontentloaded", timeout=self._timeout)
            self.page.wait_for_timeout(3000)
            for _ in range(4):
                self.page.mouse.wheel(0, 900)
                self.page.wait_for_timeout(500)
        except Exception:
            return []

        scoped: list[dict[str, Any]] = []
        try:
            scoped = self.page.evaluate(
                "() => Array.from(document.querySelectorAll("
                "'[data-component^=\"cart-item:CartItem:\"]')).map(el => {"
                " const a = el.querySelector(\"a[href*='/p/']\");"
                " let id = null;"
                " if (a) { const m = a.getAttribute('href').match("
                "/\\/p\\/(?:[^/]+\\/)*(\\d{6,})/); if (m) id = m[1]; }"
                " let qty = 1; const q = el.querySelector("
                "\"input[type='number'], input[name*='quantity' i],"
                " [data-testid*='quantity' i] input\");"
                " if (q && q.value) { const n = parseInt(q.value, 10);"
                " if (n > 0) qty = n; }"
                " return { item_id: id, qty }; }).filter(x => x.item_id)"
            ) or []
        except Exception:
            scoped = []

        basics: list[dict[str, Any]] = []
        seen: dict[str, dict[str, Any]] = {}
        if scoped:
            for row in scoped:
                pid = str(row.get("item_id"))
                qty = row.get("qty") if isinstance(row.get("qty"), int) else 1
                if pid in seen:
                    seen[pid]["qty"] += qty
                    continue
                entry = {"item_id": pid,
                         "product_url": f"https://www.homedepot.com/p/{pid}",
                         "qty": qty}
                seen[pid] = entry
                basics.append(entry)
            return basics

        # Fallback: unknown cart layout - pull distinct /p/ ids from the raw HTML.
        html = self.page.content() or ""
        seen_ids: set[str] = set()
        for pid in _ITEM_ID_RE.findall(html):
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            basics.append({
                "item_id": pid,
                "product_url": f"https://www.homedepot.com/p/{pid}",
                "qty": 1,
            })
        return basics

    def find_instock_products(self, term: str, *, limit: int = 10) -> list[str]:
        """Search a term and return product IDs (for finding items stocked at a store)."""
        url = f"https://www.homedepot.com/s/{term.replace(' ', '%20')}"
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=self._timeout)
            self.page.wait_for_timeout(2500)
            html = self.page.content() or ""
        except Exception:
            return []
        ids: list[str] = []
        for pid in _ITEM_ID_RE.findall(html):
            if pid not in ids:
                ids.append(pid)
        return ids[:limit]


def _safe_float(value: Any) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


_STOREMARKER_G_RE = re.compile(r'<g[^>]*class="storemarker"[^>]*>.*?</g>', re.DOTALL)


def _strip_storemarker(svg: Any) -> Any:
    """Remove the per-product drop-pin <g> so only our route overlay shows pins."""
    if not isinstance(svg, str):
        return svg
    return _STOREMARKER_G_RE.sub("", svg)

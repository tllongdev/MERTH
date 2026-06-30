"""Verify Scrapling can reach a Home Depot product page past Akamai.

Usage:
    cd service
    uv run python scripts/verify_scrape.py            # direct (likely 403 from a datacenter IP)
    MERTH_PROXY=http://user:pass@host:port uv run python scripts/verify_scrape.py

Success = page content contains "Aisle"/"storemap" and not an Akamai error page.
Failure = "Error Page" / 403 -> set MERTH_PROXY to a residential proxy.
"""

from __future__ import annotations

import sys

from scrapling.fetchers import StealthyFetcher

from merth_service.config import settings

PDP = "https://www.homedepot.com/p/205952637"  # DEWALT drill bit set (sample product)
STORE_ID = "1912"  # North Avenue, Chicago - the sample store for testing
STORE_COOKIES = [
    {"name": "THD_LOCALIZED_STORE_ID", "value": STORE_ID, "domain": ".homedepot.com", "path": "/"}
]


def main() -> int:
    print(f"[verify] store=#{STORE_ID} proxy={'set' if settings.proxy else 'none'} "
          f"headless={settings.headless}")
    page = StealthyFetcher.fetch(
        PDP,
        headless=settings.headless,
        solve_cloudflare=True,
        block_webrtc=True,
        hide_canvas=True,
        timeout=settings.timeout_ms,
        proxy=settings.proxy,
        cookies=STORE_COOKIES,
        network_idle=True,
    )
    status = getattr(page, "status", "?")
    text = page.get_all_text() if hasattr(page, "get_all_text") else str(page)
    blocked = "Error Page" in text or "Access Denied" in text or status in (403, 429)
    has_signal = ("Aisle" in text) or ("storemap" in text.lower())

    print(f"[verify] status={status} blocked={blocked} has_aisle/storemap={has_signal}")
    if blocked or not has_signal:
        print("[verify] STILL BLOCKED - set MERTH_PROXY to a residential proxy and retry.")
        return 1
    print("[verify] PASS - Scrapling cleared the bot wall.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

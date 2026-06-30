"""Runtime configuration, read from the environment.

Home Depot is fronted by Akamai Bot Manager. Scrapling's StealthyFetcher defeats
fingerprint/CDP-leak detection (and auto-solves Cloudflare), which is often
enough - but Akamai's `_abck` sensor scoring on a hardened target like
homedepot.com may still flag a datacenter IP. The reliable fix is a residential
proxy: set MERTH_PROXY and Scrapling routes every request through it.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    """Scrape + server settings."""

    # Residential proxy URL, e.g. "http://user:pass@host:port". Empty = direct.
    proxy: str | None
    # Run the browser headless. Home Depot's Akamai 403s a headless browser but
    # lets a real, headful Chrome through - so we default to headful real Chrome.
    headless: bool
    # Use the locally installed Google Chrome (real_chrome) instead of bundled
    # chromium. This is what clears Akamai (confirmed: headless chromium -> 403,
    # headful real Chrome -> 200).
    real_chrome: bool
    # Connect to an already-running Chrome over CDP (e.g. http://localhost:9222)
    # instead of launching one. Use this to reuse YOUR warmed/trusted Chrome
    # session - the most reliable way past Akamai. Empty = launch a browser.
    cdp_url: str | None
    # Per-operation timeout (ms) Scrapling uses for navigation/waits.
    timeout_ms: int
    # CORS origin allowed to call this service (the Next.js web app).
    web_origin: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            proxy=os.getenv("MERTH_PROXY") or None,
            headless=_as_bool(os.getenv("MERTH_HEADLESS"), default=False),
            real_chrome=_as_bool(os.getenv("MERTH_REAL_CHROME"), default=True),
            cdp_url=os.getenv("MERTH_CDP_URL") or None,
            timeout_ms=int(os.getenv("MERTH_TIMEOUT_MS", "60000")),
            web_origin=os.getenv("MERTH_WEB_ORIGIN", "http://localhost:3000"),
        )


settings = Settings.from_env()

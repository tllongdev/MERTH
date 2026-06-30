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
    # Run the stealth browser headless. Headful can pass Akamai more often locally.
    headless: bool
    # Per-operation timeout (ms) Scrapling uses for navigation/waits.
    timeout_ms: int
    # CORS origin allowed to call this service (the Next.js web app).
    web_origin: str

    @classmethod
    def from_env(cls) -> "Settings":
        proxy = os.getenv("MERTH_PROXY") or None
        return cls(
            proxy=proxy,
            headless=_as_bool(os.getenv("MERTH_HEADLESS"), default=True),
            timeout_ms=int(os.getenv("MERTH_TIMEOUT_MS", "45000")),
            web_origin=os.getenv("MERTH_WEB_ORIGIN", "http://localhost:3000"),
        )


settings = Settings.from_env()

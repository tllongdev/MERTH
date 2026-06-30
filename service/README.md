# MERTH service (Python)

The brains of MERTH: scrape Home Depot's interactive store-map SVG for a chosen
store, read each cart item's drop-pin `(x, y)` off that SVG grid, optimize the
visiting order with a simulated-annealing Traveling Salesman solver, and render
the route back onto the real floor plan.

FastAPI + [patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright) (a
stealth Playwright fork) driving your installed Google Chrome. The TypeScript app
in [`../web`](../web) is UI only and calls this.

## Layout

```
merth_service/
  models.py      Pydantic types (camelCase JSON for the UI)
  salesman.py    Open-path simulated-annealing TSP (Manhattan metric, seeded)
  routing.py     plan_route(): items -> ordered path, SVG path, viewBox; aisle/bay parsing
  svg.py         Inject route path + numbered pins into the captured store-map SVG
  browser.py     MerthBrowser: the Akamai bypass + mobile store-map extraction engine
  scraper.py     Orchestrate cart -> per-item drop-pin (x,y) + floor-plan SVG
  planner.py     scrape -> optimize -> inject route into the real SVG
  config.py      Env-driven settings (headless, timeout, CORS origin)
  main.py        FastAPI app: POST /plan
scripts/
  capture_map.py Standalone proof: capture the #1912 store map + a real drop-pin
  e2e_demo.py    Full pipeline (search-sourced items) -> route -> .scratch/e2e_route.png
  e2e_cart.py    Full pipeline from a REAL cart -> route -> .scratch/e2e_cart.png
  cart_test.py   Build a real cart in-session and verify parse_cart extracts it
```

## Run it

```bash
cd service
uv sync                       # installs patchright; uses your system Google Chrome
uv run uvicorn merth_service.main:app --reload --port 8000
```

`POST http://localhost:8000/plan` with `{ "cartUrl": "...", "storeId": "1912" }`
returns `{ items, route, mapSvg }`.

## Getting past Akamai (and onto the mobile store-map)

homedepot.com is fronted by **Akamai Bot Manager**, and the interactive store-map
only exists on the **mobile** site. A cold automated mobile browser is 403'd - its
`_abck` sensor cookie never validates. The working sequence (`browser.py`), proven
end to end with **no proxy**:

1. Launch real Chrome (persistent profile) and attach over CDP.
2. **Warm + accept cookies in desktop mode** so Akamai validates `_abck`.
3. **Localize** any store: `homedepot.com/l/<storeId>` 301-resolves to that store's
   canonical page (no per-store table or API key needed); we read its coords for a
   geolocation hint and click "Set as My Store".
4. **Flip the same trusted live session to Chrome-for-Android mobile** via the CDP
   Emulation domain (UA + device metrics + touch). The session stays trusted.
5. On each PDP, tap **Store Map**, then read the `g.storemarker` `data-x`/`data-y`
   pin (it populates a beat after the overlay opens, so we poll) and capture the
   `<svg title="Store layout for ...">` floor plan as the render canvas.

Prove it:

```bash
uv run python scripts/capture_map.py   # captures the #1912 map + a real pin
uv run python scripts/e2e_demo.py      # search-sourced items -> .scratch/e2e_route.png
uv run python scripts/e2e_cart.py      # REAL cart -> route -> .scratch/e2e_cart.png
```

> Localization is generic: pass any `storeId` and MERTH resolves it via
> `homedepot.com/l/<storeId>`. `parse_cart` scopes to the cart's `CartItem`
> line-item components, so "recommended"/"frequently bought" carousels are
> excluded; it falls back to a whole-page `/p/` scan for unknown cart layouts.

## Dev checks

```bash
uv run mypy merth_service
uv run ruff check merth_service
```

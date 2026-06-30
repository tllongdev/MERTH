# MERTH service (Python)

The brains of MERTH: scrape Home Depot's interactive store-map SVG for a chosen
store, read each cart item's drop-pin `(x, y)` off that SVG grid, optimize the
visiting order with a simulated-annealing Traveling Salesman solver, and render
the route back onto the real floor plan.

FastAPI + [Scrapling](https://github.com/D4Vinci/Scrapling) (stealth browser
automation). The TypeScript app in [`../web`](../web) is UI only and calls this.

## Layout

```
merth_service/
  models.py      Pydantic types (camelCase JSON for the UI)
  salesman.py    Open-path simulated-annealing TSP (Manhattan metric, seeded)
  routing.py     plan_route(): items -> ordered path, SVG path, viewBox; aisle/bay parsing
  svg.py         Inject route path + numbered pins into the captured store-map SVG
  scraper.py     Scrapling StealthyFetcher: cart + per-item drop-pin (x,y) + floor-plan SVG
  planner.py     scrape -> optimize -> inject route into the real SVG
  config.py      Env-driven settings (proxy, headless, timeout, CORS origin)
  main.py        FastAPI app: POST /plan
scripts/
  verify_scrape.py   Check Scrapling can clear Akamai on a product page
```

## Run it

```bash
cd service
uv sync                       # or: pip install -e .
scrapling install             # one-time: downloads the stealth browser + deps
cp .env.example .env          # set MERTH_PROXY if you have a residential proxy
uv run uvicorn merth_service.main:app --reload --port 8000
```

`POST http://localhost:8000/plan` with `{ "cartUrl": "...", "storeId": "1912" }`
returns `{ items, route, mapSvg }`.

## Getting past Akamai

homedepot.com is fronted by **Akamai Bot Manager**. Scrapling's `StealthyFetcher`
runs a de-fingerprinted (patchright) browser that patches CDP/WebRTC leaks,
headless tells, and canvas fingerprinting - which clears most bot walls outright,
and auto-solves Cloudflare. Akamai's `_abck` sensor scoring on a hardened target
can still flag a **datacenter IP**, so set `MERTH_PROXY` to a residential proxy and
every request routes through it. Verify with:

```bash
uv run python scripts/verify_scrape.py
```

> The `SELECTORS` map in `merth_service/scraper.py` is inherited from the original
> 2020 build; once you are reliably past Akamai, re-verify it against the live DOM.

## Dev checks

```bash
uv run mypy merth_service
uv run ruff check merth_service
```

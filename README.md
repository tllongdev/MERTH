# MERTH - Most Efficient Route Through HomeDepot

> _Merth_ (Gaelic): a decision in a time of crisis.

![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-service-009688?logo=fastapi&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-real%20device%20emulation-4285F4?logo=googlechrome&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![License](https://img.shields.io/badge/license-MIT-orange)

Paste a Home Depot shared-cart URL, pick a store, and MERTH plots the shortest
walking route to collect every item - **drawn on that store's real floor-plan
map** - then guides you through it stop by stop.

![MERTH route on the real North Avenue #1912 store map](docs/example-route.png)

<sub>A real run: Home Depot's actual store-map SVG for North Avenue #1912 (live
scraped), with five real in-stock items as numbered stops and the optimized route
from IN (entrance) to PAY (registers).</sub>

This is **v2**: a rebuild of the original 2020 Puppeteer sprint project
(preserved in [`legacy/`](./legacy)).

## The core idea

Home Depot ships an **interactive store-map SVG** for each store, and every
product page drops a **location pin on that SVG** for the chosen store. MERTH
exploits that:

1. **Read the cart** - resolve a shared-cart URL into a list of products.
2. **Locate each item** - open each product page for the chosen store, open the
   store-map SVG, and read the drop pin's `(x, y)` straight out of the SVG.
   Because an SVG is a coordinate grid, those pins are real Cartesian points.
3. **Optimize the route** - simulated-annealing Traveling Salesman over those
   points, as an **open path** (enter at the front, finish at the registers)
   using **Manhattan distance** (you walk along aisles, not diagonally).
4. **Render** - inject the route and numbered pins back into the **real captured
   store-map SVG** and show it, alongside a walking-order pick list.

The whole point is step 4: you see the actual store map with your path on it.

## Architecture

Two parts, clean split by responsibility:

```
service/   Python (FastAPI + patchright/Chrome) - ALL logic: scrape, TSP, SVG injection
web/       Next.js (TypeScript) - UI ONLY: form, render the returned map, pick list
legacy/    Original 2020 Puppeteer proof-of-concept (reference only)
```

- **`service/`** drives a real Chrome (via patchright) to scrape the store map,
  does the route math (simulated-annealing TSP), and injects the route into the
  captured SVG. It exposes `POST /plan { cartUrl, storeId } -> { items, route, mapSvg }`.
  See [`service/README.md`](./service/README.md).
- **`web/`** is purely the interface. It calls the service through a thin
  same-origin `/api/plan` proxy and renders the returned map + pick list.

### Why Python owns the scrape (and the routing)

The routing is pure math - an LLM is strictly worse at it than the TSP solver, so
there's no agent in the hot path. And the data that matters can't come from an
API: there is **no public API** for the store floor plan or the per-product
drop-pin `(x, y)`. The only way to get them is to read the interactive store-map
SVG, exactly as the original 2020 build did - and that store-map UI only exists on
Home Depot's **mobile** site, so MERTH drives a real Chrome in mobile device mode.

## Run it (two terminals)

Service (Python):

```bash
cd service
uv sync                   # patchright drives your installed Google Chrome
uv run uvicorn merth_service.main:app --reload --port 8000
```

Web (Next.js):

```bash
cd web
npm install
npm run dev               # http://localhost:3000
```

Paste a shared-cart URL and **any** store ID, then **Plan my route** - MERTH
resolves the store automatically via `homedepot.com/l/<storeId>`. The sample store
pre-filled for testing is **#1912 - North Avenue, Chicago** (1232 W North Ave).

## Getting past the bot wall

homedepot.com is fronted by **Akamai Bot Manager**, and the store-map feature
lives only on the mobile site. The hard part is that a cold automated *mobile*
browser is 403'd and Akamai's `_abck` sensor never validates. MERTH's sequence
(in [`service/merth_service/browser.py`](./service/merth_service/browser.py))
is the bypass, and it needs **no proxy**:

1. Launch a real Chrome (system install, persistent profile).
2. **Warm + accept cookies in desktop mode** so Akamai validates `_abck` (a real
   desktop fingerprint passes where a fresh mobile one doesn't).
3. **Localize** the store (spoof geolocation + click "Set as My Store").
4. **Flip the same, now-trusted, live session to Chrome-for-Android mobile** via
   the CDP Emulation domain. The session stays trusted across the flip, so the
   mobile store-map UI loads.
5. On each product page, tap **Store Map** and read the `g.storemarker`
   `data-x`/`data-y` drop-pin + capture the `<svg title="Store layout for ...">`.

See `scripts/capture_map.py` (standalone proof) and `scripts/e2e_demo.py`
(full cart -> route -> rendered map) in `service/`.

## License

MIT - Timothy Lee Long

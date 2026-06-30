"""FastAPI app exposing the route planner.

POST /plan { cartUrl, storeId } -> PlanResult (items, route, mapSvg)

The scrape uses Scrapling's sync StealthyFetcher (Playwright sync API under the
hood), so the path operation is defined with `def` - FastAPI runs sync handlers in
a threadpool, which is exactly where Playwright's sync API must live (no running
event loop). Keep it sync; do not make this `async def`.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import PlanRequest, PlanResult
from .planner import plan

app = FastAPI(title="MERTH service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/plan", response_model=PlanResult)
def plan_endpoint(body: PlanRequest) -> PlanResult:
    if not body.cart_url or not body.store_id:
        raise HTTPException(
            status_code=400,
            detail={"message": "Provide both a shared-cart URL and a store ID.", "code": "bad_input"},
        )
    try:
        return plan(body.cart_url, body.store_id)
    except ValueError as err:
        raise HTTPException(
            status_code=422, detail={"message": str(err), "code": "plan_failed"}
        ) from err
    except Exception as err:  # noqa: BLE001 - surface scrape/browser failures cleanly
        raise HTTPException(
            status_code=502,
            detail={"message": f"Route planning failed: {err}", "code": "scrape_failed"},
        ) from err

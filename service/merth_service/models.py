"""Pydantic models.

JSON is emitted in camelCase (via an alias generator) so the TypeScript UI can
consume it without a translation layer, while the Python code stays snake_case.
FastAPI serializes responses by alias by default.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

PointKind = Literal["entrance", "item", "checkout"]


class _Base(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PlanRequest(_Base):
    cart_url: str
    store_id: str


class CartItem(_Base):
    """A product in the cart, before we know where it lives in the store."""

    item_id: str
    name: str
    brand: str | None = None
    qty: int = 1
    unit_price: float | None = None
    image_url: str | None = None
    product_url: str | None = None
    # Identifiers used for in-store scan-to-confirm (match a scanned barcode).
    internet_number: str | None = None
    store_sku: str | None = None
    model_number: str | None = None
    upc: str | None = None


class LocatedItem(CartItem):
    """A cart item enriched with its physical location in a specific store."""

    location_text: str | None = None
    aisle: str | None = None
    bay: str | None = None
    # Store-map coordinates (Home Depot's interactive-map pixel space). None = not mappable.
    x: float | None = None
    y: float | None = None
    in_stock: bool = False


class RoutePoint(_Base):
    x: float
    y: float
    label: str
    kind: PointKind
    item: LocatedItem | None = None


class ViewBox(_Base):
    min_x: float
    min_y: float
    width: float
    height: float


class RouteResult(_Base):
    ordered: list[RoutePoint]
    path_d: str
    total_distance: float
    view_box: ViewBox
    unlocated: list[LocatedItem]


class PlanResult(_Base):
    store_id: str
    items: list[LocatedItem]
    route: RouteResult
    # The real Home Depot store-map SVG with the route + numbered pins injected.
    map_svg: str

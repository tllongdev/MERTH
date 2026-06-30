"""Inject the optimized route (path + numbered pins + entrance/checkout markers)
into Home Depot's captured store-map SVG.

The route coordinates are already in the SVG's own coordinate space (they come
from the same drop pins), so we append elements right before the closing tag -
exactly what the original MERTH did to the live `.storemap-wrapper`, but produced
server-side as a self-contained SVG. Ported from the TypeScript `svg.ts`."""

from __future__ import annotations

from html import escape

from .models import RouteResult


def inject_route_into_map(map_svg: str, route: RouteResult) -> str:
    scale = max(route.view_box.width, route.view_box.height) or 100.0
    r = scale * 0.022
    dash = f"{r * 1.1} {r * 0.7}"

    route_path = (
        f'<path d="{escape(route.path_d, quote=True)}" fill="none" stroke="#f96302" '
        f'stroke-width="{r * 0.4}" stroke-linecap="round" stroke-linejoin="round" '
        f'stroke-dasharray="{dash}" opacity="0.95"></path>'
    )

    parts: list[str] = []
    stop = 0
    for p in route.ordered:
        if p.kind == "item":
            stop += 1
            item_id = p.item.item_id if p.item else ""
            # data-stop / data-item-id let the client highlight the current pin and
            # dim picked ones during the guided in-store walk.
            parts.append(
                f'<g class="merth-stop" data-stop="{stop}" '
                f'data-item-id="{escape(item_id, quote=True)}">'
                f'<circle cx="{p.x}" cy="{p.y}" r="{r}" fill="#f96302" '
                f'stroke="#ffffff" stroke-width="{r * 0.14}"></circle>'
                f'<text x="{p.x}" y="{p.y}" fill="#ffffff" font-size="{r * 1.2}" '
                f'font-weight="700" text-anchor="middle" '
                f'dominant-baseline="central">{stop}</text></g>'
            )
            continue
        fill = "#36c08a" if p.kind == "entrance" else "#e8eaed"
        label = "IN" if p.kind == "entrance" else "PAY"
        text_fill = "#ffffff" if p.kind == "entrance" else "#0c0d10"
        parts.append(
            f'<g class="merth-terminal" data-kind="{p.kind}">'
            f'<rect x="{p.x - r}" y="{p.y - r}" width="{r * 2}" height="{r * 2}" '
            f'rx="{r * 0.3}" fill="{fill}" stroke="#0c0d10" stroke-width="{r * 0.1}"></rect>'
            f'<text x="{p.x}" y="{p.y}" fill="{text_fill}" font-size="{r * 0.7}" '
            f'font-weight="700" text-anchor="middle" '
            f'dominant-baseline="central">{label}</text></g>'
        )

    overlay = route_path + "".join(parts)
    close_idx = map_svg.rfind("</svg>")
    if close_idx == -1:
        return map_svg
    return map_svg[:close_idx] + overlay + map_svg[close_idx:]

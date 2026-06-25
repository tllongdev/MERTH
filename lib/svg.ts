import type { RouteResult } from "./types";

/**
 * Inject the optimized route (path + numbered pins + entrance/checkout markers)
 * into Home Depot's captured store-map SVG. The route coordinates are already in
 * the SVG's own coordinate space (they come from the same drop pins), so we just
 * append elements before the closing tag - exactly what the original MERTH did to
 * the live `.storemap-wrapper`, but produced server-side as a self-contained SVG.
 */
export function injectRouteIntoMap(mapSvg: string, route: RouteResult): string {
  const scale = Math.max(route.viewBox.width, route.viewBox.height) || 100;
  const r = scale * 0.022;
  const dash = `${r * 1.1} ${r * 0.7}`;

  const routePath =
    `<path d="${route.pathD}" fill="none" stroke="#f96302" ` +
    `stroke-width="${r * 0.4}" stroke-linecap="round" stroke-linejoin="round" ` +
    `stroke-dasharray="${dash}" opacity="0.95"></path>`;

  let stop = 0;
  const markers = route.ordered
    .map((p) => {
      if (p.kind === "item") {
        stop += 1;
        return (
          `<g><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#f96302" ` +
          `stroke="#ffffff" stroke-width="${r * 0.14}"></circle>` +
          `<text x="${p.x}" y="${p.y}" fill="#ffffff" font-size="${r * 1.2}" ` +
          `font-weight="700" text-anchor="middle" dominant-baseline="central">${stop}</text></g>`
        );
      }
      const fill = p.kind === "entrance" ? "#36c08a" : "#e8eaed";
      const label = p.kind === "entrance" ? "IN" : "PAY";
      const textFill = p.kind === "entrance" ? "#ffffff" : "#0c0d10";
      return (
        `<g><rect x="${p.x - r}" y="${p.y - r}" width="${r * 2}" height="${r * 2}" ` +
        `rx="${r * 0.3}" fill="${fill}" stroke="#0c0d10" stroke-width="${r * 0.1}"></rect>` +
        `<text x="${p.x}" y="${p.y}" fill="${textFill}" font-size="${r * 0.7}" ` +
        `font-weight="700" text-anchor="middle" dominant-baseline="central">${label}</text></g>`
      );
    })
    .join("");

  const overlay = routePath + markers;
  const closeIdx = mapSvg.lastIndexOf("</svg>");
  if (closeIdx === -1) return mapSvg;
  return mapSvg.slice(0, closeIdx) + overlay + mapSvg.slice(closeIdx);
}

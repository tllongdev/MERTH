import type { RouteResult } from "@/lib/types";

/**
 * Renders the optimized route.
 *
 * In live mode we receive the real Home Depot floor-plan SVG with the route
 * already injected (same coordinate space as the drop pins) and render it
 * directly. In demo mode (or if the floor plan could not be captured) we fall
 * back to an abstract grid built from the route coordinates.
 */
export function StoreMap({ route, mapSvg }: { route: RouteResult; mapSvg?: string | null }) {
  if (mapSvg) {
    return (
      <div className="real-map" dangerouslySetInnerHTML={{ __html: mapSvg }} aria-label="Store map with route" />
    );
  }
  const { viewBox, pathD, ordered } = route;
  const vb = `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`;
  const markerR = Math.max(viewBox.width, viewBox.height) * 0.022;
  const fontSize = markerR * 1.2;

  // Faint reference grid to read as a store floor.
  const gridStep = niceStep(Math.max(viewBox.width, viewBox.height) / 8);
  const gridLines: React.ReactNode[] = [];
  for (let gx = Math.ceil(viewBox.minX / gridStep) * gridStep; gx < viewBox.minX + viewBox.width; gx += gridStep) {
    gridLines.push(
      <line key={`vx${gx}`} x1={gx} y1={viewBox.minY} x2={gx} y2={viewBox.minY + viewBox.height} className="grid-line" />,
    );
  }
  for (let gy = Math.ceil(viewBox.minY / gridStep) * gridStep; gy < viewBox.minY + viewBox.height; gy += gridStep) {
    gridLines.push(
      <line key={`hy${gy}`} x1={viewBox.minX} y1={gy} x2={viewBox.minX + viewBox.width} y2={gy} className="grid-line" />,
    );
  }

  let stopNumber = 0;

  return (
    <svg viewBox={vb} role="img" aria-label="Optimized in-store route">
      <style>{`
        .grid-line { stroke: rgba(255,255,255,0.05); stroke-width: ${markerR * 0.04}; }
        .route { stroke: var(--accent); stroke-width: ${markerR * 0.32}; fill: none;
                 stroke-linecap: round; stroke-linejoin: round; opacity: 0.95;
                 stroke-dasharray: ${markerR * 0.9} ${markerR * 0.6}; }
        .stopdot { fill: var(--accent); }
        .stoptext { fill: #fff; font-weight: 700; text-anchor: middle; dominant-baseline: central; }
        .terminal { stroke: #0c0d10; stroke-width: ${markerR * 0.08}; }
      `}</style>

      {gridLines}

      <path className="route" d={pathD} />

      {ordered.map((p, i) => {
        if (p.kind === "entrance") {
          return (
            <g key={`pt${i}`}>
              <rect
                x={p.x - markerR}
                y={p.y - markerR}
                width={markerR * 2}
                height={markerR * 2}
                rx={markerR * 0.3}
                fill="var(--green)"
                className="terminal"
              />
              <text x={p.x} y={p.y} className="stoptext" fontSize={fontSize * 0.7}>
                IN
              </text>
            </g>
          );
        }
        if (p.kind === "checkout") {
          return (
            <g key={`pt${i}`}>
              <rect
                x={p.x - markerR}
                y={p.y - markerR}
                width={markerR * 2}
                height={markerR * 2}
                rx={markerR * 0.3}
                fill="#e8eaed"
                className="terminal"
              />
              <text x={p.x} y={p.y} className="stoptext" fill="#0c0d10" fontSize={fontSize * 0.6}>
                PAY
              </text>
            </g>
          );
        }
        stopNumber += 1;
        return (
          <g key={`pt${i}`}>
            <circle cx={p.x} cy={p.y} r={markerR} className="stopdot terminal" />
            <text x={p.x} y={p.y} className="stoptext" fontSize={fontSize}>
              {stopNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Round a step to a friendly 1/2/5 * 10^n value for grid spacing. */
function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * pow;
}

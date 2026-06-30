"use client";

import { useEffect, useRef } from "react";

/**
 * Renders the real Home Depot store-map SVG for the chosen store, with the
 * optimized route and numbered item pins already injected server-side (same
 * coordinate space as the scraped drop pins).
 *
 * During the guided walk we highlight the current stop and dim the picked ones
 * by toggling classes on the injected `[data-stop]` groups (the server tags each
 * item marker with its stop number + item id).
 */
export function StoreMap({
  mapSvg,
  currentItemId,
  pickedIds,
  guiding = false,
}: {
  mapSvg: string;
  currentItemId?: string | null;
  pickedIds?: ReadonlySet<string>;
  guiding?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    svg?.classList.toggle("guiding", guiding);
    root.querySelectorAll<SVGGElement>("g.merth-stop").forEach((g) => {
      const id = g.getAttribute("data-item-id") ?? "";
      g.classList.toggle("picked", !!pickedIds?.has(id));
      g.classList.toggle("current", !!currentItemId && id === currentItemId);
    });
  }, [mapSvg, currentItemId, pickedIds, guiding]);

  return (
    <div
      ref={ref}
      className="real-map"
      dangerouslySetInnerHTML={{ __html: mapSvg }}
      aria-label="Store map with optimized route"
    />
  );
}

"use client";

import { useState } from "react";
import { GuidedPlan } from "@/components/GuidedPlan";
import type { PlanResult } from "@/lib/types";

export default function Home() {
  const [cartUrl, setCartUrl] = useState("");
  // Default to the North Avenue, Chicago store (#1912) - the sample store for testing.
  const [storeId, setStoreId] = useState("1912");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);

  async function plan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cartUrl, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as PlanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="brand">
        <div className="logo">M</div>
        <h1>MERTH</h1>
      </div>
      <p className="tagline">
        Most Efficient Route Through HomeDepot - paste a cart, pick a store, walk the shortest path
        across the real store map.
      </p>

      {result ? (
        <GuidedPlan result={result} onReset={() => setResult(null)} />
      ) : (
        <section className="card controls">
          <div className="row two">
            <div className="field">
              <label htmlFor="cart">Shared cart URL</label>
              <input
                id="cart"
                placeholder="https://www.homedepot.com/mycart/home?...sharedCartId=HL..."
                value={cartUrl}
                onChange={(e) => setCartUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="store">Store ID</label>
              <input
                id="store"
                placeholder="1912"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              />
              <span className="hint">Sample: North Avenue, Chicago (#1912)</span>
            </div>
          </div>

          <div>
            <button className="go" onClick={plan} disabled={loading || !cartUrl || !storeId}>
              {loading ? "Mapping your route..." : "Plan my route"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </section>
      )}

      <p className="footer">
        MERTH - simulated-annealing route optimization over Home Depot&apos;s own store-map SVG.
      </p>
    </main>
  );
}

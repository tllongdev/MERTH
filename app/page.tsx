"use client";

import { useState } from "react";
import { StoreMap } from "@/components/StoreMap";
import type { PlanResult } from "@/lib/types";

type Mode = "demo" | "live";

export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [cartUrl, setCartUrl] = useState("");
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  async function plan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, cartUrl, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as PlanResult);
      setDone(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function toggle(itemId: string) {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  const stops = result ? result.route.ordered.filter((p) => p.kind === "item") : [];

  return (
    <main className="wrap">
      <div className="brand">
        <div className="logo">M</div>
        <h1>MERTH</h1>
      </div>
      <p className="tagline">
        Most Efficient Route Through Home Depot - paste a cart, pick a store, walk the shortest path.
      </p>

      <section className="card controls">
        <div className="modes" role="tablist">
          <button data-active={mode === "demo"} onClick={() => setMode("demo")}>
            Demo
          </button>
          <button data-active={mode === "live"} onClick={() => setMode("live")}>
            Live (experimental)
          </button>
        </div>

        {mode === "live" ? (
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
            </div>
          </div>
        ) : (
          <p className="hint">
            Demo mode replays a real captured cart (5 located items + 1 front-of-store item) at
            store #1912 and runs the full routing pipeline - no network required.
          </p>
        )}

        <div>
          <button className="go" onClick={plan} disabled={loading}>
            {loading ? "Optimizing route..." : "Plan my route"}
          </button>
        </div>

        {mode === "live" && (
          <p className="hint">
            Live mode warms an Akamai session with Playwright, then queries Home Depot&apos;s GraphQL
            gateway for cart + aisle/bay. Requires <code>npx playwright install chromium</code> and is
            subject to bot protection / schema drift.
          </p>
        )}

        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <div className="results">
          <section className="card">
            <div className="panel-head">
              <h2>Route map</h2>
              <span className="meta">
                Store #{result.storeId}{" "}
                <span className={`badge ${result.source}`}>{result.source}</span>
              </span>
            </div>
            <div className="map-body">
              <StoreMap route={result.route} mapSvg={result.mapSvg} />
            </div>
            <div className="summary">
              <span>
                <b>{stops.length}</b> stops
              </span>
              <span>
                <b>{Math.round(result.route.totalDistance)}</b> map units walked
              </span>
              <span>
                <b>{result.route.unlocated.length}</b> at front of store
              </span>
            </div>
          </section>

          <section className="card">
            <div className="panel-head">
              <h2>Pick list</h2>
              <span className="meta">in walking order</span>
            </div>
            <ol className="checklist">
              {stops.map((stop, i) => {
                const item = stop.item!;
                return (
                  <li
                    key={item.itemId}
                    className="stop"
                    data-done={done.has(item.itemId)}
                    onClick={() => toggle(item.itemId)}
                  >
                    <span className="num">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt="" />
                    <div>
                      <div className="name">
                        {item.brand ? <strong>{item.brand} </strong> : null}
                        {item.name}
                      </div>
                      {item.locationText && <div className="loc">{item.locationText}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>

            {result.route.unlocated.length > 0 && (
              <div className="unlocated">
                <h3>Grab at the front / special order</h3>
                <ul>
                  {result.route.unlocated.map((item) => (
                    <li key={item.itemId}>
                      {item.brand ? `${item.brand} ` : ""}
                      {item.name}
                      {item.locationText ? ` - ${item.locationText}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      <p className="footer">
        MERTH v2 - simulated-annealing route optimization. Originally a 2020 Puppeteer sprint, rebuilt
        API-first.
      </p>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreMap } from "@/components/StoreMap";
import { Scanner, barcodeScanningSupported } from "@/components/Scanner";
import type { LocatedItem, PlanResult, RoutePoint } from "@/lib/types";

type ItemStop = RoutePoint & { item: LocatedItem };

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Identifiers a scanned barcode can match against for a given item. */
function codesFor(item: LocatedItem): string[] {
  return [item.itemId, item.internetNumber, item.storeSku, item.upc, item.modelNumber]
    .filter((v): v is string => !!v)
    .map(String);
}

export function GuidedPlan({ result, onReset }: { result: PlanResult; onReset: () => void }) {
  const stops = useMemo(
    () => result.route.ordered.filter((p): p is ItemStop => p.kind === "item" && !!p.item),
    [result],
  );
  const stopNumber = useMemo(() => {
    const m = new Map<string, number>();
    stops.forEach((s, i) => m.set(s.item.itemId, i + 1));
    return m;
  }, [stops]);

  const storageKey = useMemo(
    () => `merth:${result.storeId}:${stops.map((s) => s.item.itemId).join(",")}`,
    [result.storeId, stops],
  );

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [showList, setShowList] = useState(false);

  // Load saved progress (offline resume).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { picked?: string[]; skipped?: string[] };
      setPicked(new Set(saved.picked ?? []));
      setSkipped(new Set(saved.skipped ?? []));
    } catch {
      // ignore corrupt state
    }
  }, [storageKey]);

  // Persist progress.
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ picked: [...picked], skipped: [...skipped] }),
      );
    } catch {
      // storage full / unavailable - non-fatal
    }
  }, [storageKey, picked, skipped]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Next target: the next unpicked stop IN THE FIXED OPTIMIZED ORDER. The route
  // is solved once (TSP / simulated annealing) on the server and never changes
  // while shopping - picking just advances along it. Skipped stops are stepped
  // over (they resurface at the end) but the path order is never recomputed.
  // Only adding/removing cart items triggers a fresh /plan + re-solve.
  const current = useMemo<ItemStop | null>(() => {
    const remaining = stops.filter((s) => !picked.has(s.item.itemId));
    if (remaining.length === 0) return null;
    const preferred = remaining.filter((s) => !skipped.has(s.item.itemId));
    return (preferred.length ? preferred : remaining)[0];
  }, [stops, picked, skipped]);

  const pick = useCallback((itemId: string) => {
    setPicked((prev) => new Set(prev).add(itemId));
    setSkipped((prev) => {
      const n = new Set(prev);
      n.delete(itemId);
      return n;
    });
  }, []);

  const unpick = useCallback((itemId: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      n.delete(itemId);
      return n;
    });
  }, []);

  const skip = useCallback((itemId: string) => {
    setSkipped((prev) => new Set(prev).add(itemId));
  }, []);

  const onScan = useCallback(
    (value: string) => {
      const v = value.trim();
      const vd = digits(v);
      const hit = stops.find((s) =>
        codesFor(s.item).some((c) => {
          if (c === v) return true;
          const cd = digits(c);
          return !!cd && !!vd && (cd === vd || cd.endsWith(vd) || vd.endsWith(cd));
        }),
      );
      if (hit) {
        pick(hit.item.itemId);
        setScanning(false);
        setToast({ text: `Confirmed: ${hit.item.name}` });
      } else {
        setToast({ text: "That barcode isn't in your cart - try the shelf tag.", bad: true });
      }
    },
    [stops, pick],
  );

  const pickedCount = picked.size;
  const total = stops.length;
  const pct = total ? Math.round((pickedCount / total) * 100) : 0;
  const stillSkipped = stops.filter(
    (s) => skipped.has(s.item.itemId) && !picked.has(s.item.itemId),
  );

  return (
    <div className="guide">
      <div className="card progress-card">
        <div className="progress-head">
          <span>
            <b>{pickedCount}</b> / {total} picked
          </span>
          <button className="link" onClick={onReset}>
            New route
          </button>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section className="card">
        <div className="map-body">
          <StoreMap
            mapSvg={result.mapSvg}
            currentItemId={current?.item.itemId}
            pickedIds={picked}
            guiding
          />
        </div>
      </section>

      {current ? (
        <section className="card current-stop">
          <div className="stop-badge">Stop {stopNumber.get(current.item.itemId)}</div>
          <div className="current-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {current.item.imageUrl ? <img src={current.item.imageUrl} alt="" /> : null}
            <div className="current-info">
              <div className="name">
                {current.item.brand ? <strong>{current.item.brand} </strong> : null}
                {current.item.name}
              </div>
              {current.item.locationText ? (
                <div className="loc-big">{current.item.locationText}</div>
              ) : (
                <div className="loc-big muted">Location on map</div>
              )}
            </div>
          </div>
          <div className="actions">
            <button className="go" onClick={() => pick(current.item.itemId)}>
              Got it
            </button>
            {barcodeScanningSupported() && (
              <button className="secondary" onClick={() => setScanning(true)}>
                Scan to confirm
              </button>
            )}
            <button className="ghost" onClick={() => skip(current.item.itemId)}>
              Can&apos;t find it
            </button>
          </div>
        </section>
      ) : (
        <section className="card done-card">
          <h2>All items collected</h2>
          <p>Head to the registers (the PAY marker on the map).</p>
          {(stillSkipped.length > 0 || result.route.unlocated.length > 0) && (
            <div className="grab-before">
              <h3>Grab before you go</h3>
              <ul>
                {stillSkipped.map((s) => (
                  <li key={s.item.itemId}>
                    {s.item.name}
                    {s.item.locationText ? ` - ${s.item.locationText}` : ""}{" "}
                    <button className="link" onClick={() => pick(s.item.itemId)}>
                      mark picked
                    </button>
                  </li>
                ))}
                {result.route.unlocated.map((item) => (
                  <li key={item.itemId}>
                    {item.brand ? `${item.brand} ` : ""}
                    {item.name} - front of store / special order
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <button className="list-toggle" onClick={() => setShowList((v) => !v)}>
          {showList ? "Hide full list" : "Show full list"}
        </button>
        {showList && (
          <ol className="checklist">
            {stops.map((s) => {
              const item = s.item;
              return (
                <li
                  key={item.itemId}
                  className="stop"
                  data-done={picked.has(item.itemId)}
                  onClick={() => (picked.has(item.itemId) ? unpick(item.itemId) : pick(item.itemId))}
                >
                  <span className="num">{stopNumber.get(item.itemId)}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="num" />}
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
        )}
      </section>

      {scanning && <Scanner onDetected={onScan} onClose={() => setScanning(false)} />}
      {toast && <div className={`toast ${toast.bad ? "bad" : ""}`}>{toast.text}</div>}
    </div>
  );
}

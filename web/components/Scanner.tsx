"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera barcode scanner using the native BarcodeDetector API. Fully client-side
 * (no network, works offline). If the browser lacks BarcodeDetector we surface
 * that so the caller can fall back to tap-to-confirm - scanning is never required.
 */
export function barcodeScanningSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8", "code_128", "code_39", "itf"];

export function Scanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: any = null;

    async function start() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector;
        if (!BD) {
          setError("This browser can't scan. Tap \"Got it\" to confirm by hand.");
          return;
        }
        detector = new BD({ formats: FORMATS });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch {
        setError("Couldn't open the camera. Check permissions, or tap \"Got it\".");
      }
    }

    async function tick() {
      if (stopped || !detector || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          onDetected(String(codes[0].rawValue));
          return;
        }
      } catch {
        // transient decode error - keep scanning
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="scanner-overlay" role="dialog" aria-label="Scan a barcode">
      <div className="scanner-frame">
        <video ref={videoRef} playsInline muted />
        <div className="scanner-reticle" />
      </div>
      {error ? (
        <p className="scanner-msg error">{error}</p>
      ) : (
        <p className="scanner-msg">Point the camera at the product or shelf-tag barcode</p>
      )}
      <button className="ghost" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

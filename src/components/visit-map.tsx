"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Peta lokasi kunjungan (Leaflet + tile OpenStreetMap, tanpa API key).
 * Leaflet di-load dinamis di client (SSR-safe); container di-isolate supaya
 * z-index pane-nya tidak menimpa dropdown/dialog admin di luar card.
 */
export default function VisitMap({
  lat,
  lng,
  zoom = 15,
  className = "h-56 w-full",
}: {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pin = L.divIcon({
        className: "visit-map-pin",
        html: `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
          <path d="M15 1C8.4 1 3 6.4 3 13c0 8.6 9.5 20 12 25.5C17.5 33 27 21.6 27 13 27 6.4 21.6 1 15 1z"
            fill="oklch(0.45 0.10 155)" stroke="oklch(0.985 0 0)" stroke-width="2"/>
          <circle cx="15" cy="13" r="4.5" fill="oklch(0.985 0 0)"/>
        </svg>`,
        iconSize: [30, 40],
        iconAnchor: [15, 38],
        popupAnchor: [0, -32],
      });
      L.marker([lat, lng], { icon: pin, keyboard: false }).addTo(map);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, zoom]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Peta lokasi kunjungan pada koordinat ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
      className={`${className} isolate overflow-hidden rounded-md border z-0`}
    />
  );
}

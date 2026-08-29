"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps-config";
import type { DeviceLocation } from "@/lib/hooks/use-device-location";
import type { ProvinceStat } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const RDC_CENTER = { lat: -2.8, lng: 23.5 };

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps"));
    document.head.appendChild(script);
  });
}

function markerScale(total: number, max: number) {
  const min = 8;
  const maxScale = 22;
  if (max <= 0) return min;
  return min + Math.sqrt(total / max) * (maxScale - min);
}

export function GoogleTerritoryMap({
  provinces,
  selectedId,
  onSelect,
  deviceLocation,
}: {
  provinces: ProvinceStat[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  deviceLocation?: DeviceLocation | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const deviceMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !containerRef.current) return;

    let cancelled = false;

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const map = new google.maps.Map(containerRef.current, {
          center: RDC_CENTER,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c4a6e" }] },
            { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#38bdf8" }] },
          ],
        });

        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => setError("Impossible de charger Google Maps. Vérifiez la clé API et les restrictions."));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const withCoords = provinces.filter((p) => p.latitude != null && p.longitude != null);
    const maxTotal = Math.max(...withCoords.map((p) => p.total), 1);
    const bounds = new google.maps.LatLngBounds();

    withCoords.forEach((province) => {
      const position = { lat: province.latitude!, lng: province.longitude! };
      bounds.extend(position);
      const selected = selectedId === province.id;
      const scale = markerScale(province.total, maxTotal);

      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position,
        title: province.name,
        label: {
          text: province.code,
          color: "#ffffff",
          fontWeight: "700",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: selected ? "#facc15" : "#0087d1",
          fillOpacity: 0.92,
          strokeColor: selected ? "#ffffff" : "#bae6fd",
          strokeWeight: selected ? 2.5 : 1.5,
        },
      });

      marker.addListener("click", () => {
        onSelect(province.id);
        infoRef.current?.setContent(
          `<div style="font-family:system-ui,sans-serif;padding:4px 2px">
            <strong>${province.name}</strong><br/>
            <span style="color:#0087d1;font-weight:700">${formatNumber(province.total)}</span> membres
            · <span style="color:#16a34a">${formatNumber(province.active)}</span> actifs
          </div>`,
        );
        infoRef.current?.open(mapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });

    if (withCoords.length > 1) {
      mapRef.current.fitBounds(bounds);
    }
  }, [ready, provinces, selectedId, onSelect]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

    deviceMarkerRef.current?.setMap(null);
    deviceMarkerRef.current = null;

    if (!deviceLocation) return;

    deviceMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: deviceLocation.latitude, lng: deviceLocation.longitude },
      title: "Votre position",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
  }, [ready, deviceLocation]);

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-200/60">
      <div className="border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
        <p className="text-xs font-medium text-brand-800">Google Maps — République Démocratique du Congo</p>
        <p className="text-[10px] text-slate-500">
          Cliquez sur une province pour explorer · Données agrégées uniquement
        </p>
      </div>
      <div ref={containerRef} className="h-[420px] w-full bg-slate-900" role="application" aria-label="Carte Google Maps" />
      {!ready && !error && (
        <p className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-500">
          Chargement de Google Maps…
        </p>
      )}
    </div>
  );
}

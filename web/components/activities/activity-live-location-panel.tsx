"use client";

import { useEffect, useRef, useState } from "react";
import { LiveLocationSharingBadge } from "@/components/activities/live-location-sharing-badge";
import { Crosshair, Loader2, MapPin, Navigation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { formatCoords } from "@/lib/geo";
import { useDeviceLocation } from "@/lib/hooks/use-device-location";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps-config";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Maps")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Maps"));
    document.head.appendChild(script);
  });
}

export function ActivityLiveLocationPanel({
  activity,
  canManage,
  onUpdated,
}: {
  activity: Activity;
  canManage: boolean;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const deviceMarkerRef = useRef<google.maps.Marker | null>(null);
  const deviceCircleRef = useRef<google.maps.Circle | null>(null);
  const venueMarkerRef = useRef<google.maps.Marker | null>(null);
  const liveMarkerRef = useRef<google.maps.Marker | null>(null);
  const locationRef = useRef<ReturnType<typeof useDeviceLocation>["location"]>(null);
  const didFitRef = useRef(false);
  const prevEnabledRef = useRef(false);

  const {
    enabled,
    location,
    status,
    error: geoError,
    activate,
    toggle,
    refresh,
    inRdc,
  } = useDeviceLocation();

  locationRef.current = location;

  const geoLoading = status === "loading";
  const geoActive = status === "active" && location != null;

  const [sharing, setSharing] = useState(activity.live_location?.active ?? false);
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const venueLat = activity.latitude ?? null;
  const venueLng = activity.longitude ?? null;
  const liveLat = activity.live_location?.latitude ?? null;
  const liveLng = activity.live_location?.longitude ?? null;

  useEffect(() => {
    setSharing(activity.live_location?.active ?? false);
  }, [activity.live_location?.active]);

  const showMap =
    Boolean(GOOGLE_MAPS_API_KEY) &&
    (geoActive || (venueLat != null && venueLng != null) || (sharing && liveLat != null && liveLng != null));

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapContainerRef.current) return;
    let cancelled = false;

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.google?.maps || mapRef.current) return;

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: { lat: -4.3217, lng: 15.3125 },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [showMap]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    deviceMarkerRef.current?.setMap(null);
    deviceCircleRef.current?.setMap(null);
    deviceMarkerRef.current = null;
    deviceCircleRef.current = null;

    if (!location || status !== "active") return;

    const position = { lat: location.latitude, lng: location.longitude };

    deviceMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position,
      title: "Ma position",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 3,
    });

    if (location.accuracy > 0) {
      deviceCircleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: position,
        radius: location.accuracy,
        fillColor: "#10b981",
        fillOpacity: 0.12,
        strokeColor: "#10b981",
        strokeOpacity: 0.35,
        strokeWeight: 1,
      });
    }
  }, [mapReady, location, status]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    venueMarkerRef.current?.setMap(null);
    venueMarkerRef.current = null;

    if (venueLat == null || venueLng == null) return;

    venueMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: venueLat, lng: venueLng },
      title: "Lieu de l'activité",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 2,
    });
  }, [mapReady, venueLat, venueLng]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    liveMarkerRef.current?.setMap(null);
    liveMarkerRef.current = null;

    if (!sharing || liveLat == null || liveLng == null) return;

    liveMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: liveLat, lng: liveLng },
      title: "Position partagée",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#0087d1",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 2,
    });
  }, [mapReady, liveLat, liveLng, sharing]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps || !location || status !== "active") return;

    if (enabled && !prevEnabledRef.current) {
      mapRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
      mapRef.current.setZoom(15);
    }
    prevEnabledRef.current = enabled;
  }, [mapReady, enabled, location, status]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps || didFitRef.current) return;

    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    if (location && status === "active") {
      bounds.extend({ lat: location.latitude, lng: location.longitude });
      count++;
    }
    if (venueLat != null && venueLng != null) {
      bounds.extend({ lat: venueLat, lng: venueLng });
      count++;
    }
    if (sharing && liveLat != null && liveLng != null) {
      bounds.extend({ lat: liveLat, lng: liveLng });
      count++;
    }

    if (count >= 2) {
      mapRef.current.fitBounds(bounds, 48);
      didFitRef.current = true;
    } else if (count === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(15);
      didFitRef.current = true;
    }
  }, [mapReady, location, status, venueLat, venueLng, liveLat, liveLng, sharing]);

  useEffect(() => {
    if (!sharing || !canManage) return;

    const sync = () => {
      const loc = locationRef.current;
      if (!loc) return;
      api
        .post(`/activities/${activity.id}/live-location/update`, {
          latitude: loc.latitude,
          longitude: loc.longitude,
        })
        .catch(() => undefined);
    };

    sync();
    const timer = setInterval(sync, 3_000);
    return () => clearInterval(timer);
  }, [sharing, canManage, activity.id]);

  async function startSharing() {
    if (!location) {
      if (!enabled) activate();
      toast.error("Activez la géolocalisation de votre appareil, puis réessayez.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/activities/${activity.id}/live-location/start`, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setSharing(true);
      toast.success("Localisation partagée — les membres sont notifiés.");
      onUpdated?.();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Partage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    setBusy(true);
    try {
      await api.post(`/activities/${activity.id}/live-location/stop`);
      setSharing(false);
      toast.success("Partage arrêté.");
      onUpdated?.();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Localisation GPS"
        description="Emplacement du lieu et suivi temps réel du responsable"
      />
      <CardBody className="space-y-4">
        {sharing ? (
          <LiveLocationSharingBadge
            title={canManage ? "Vous partagez votre position" : "Position partagée en direct"}
            subtitle={
              canManage
                ? "Les membres peuvent suivre votre emplacement en temps réel."
                : activity.live_location?.shared_by
                  ? `Signal diffusé par ${activity.live_location.shared_by}.`
                  : "Le responsable diffuse sa position GPS en temps réel."
            }
          />
        ) : null}

        {!GOOGLE_MAPS_API_KEY ? (
          <Alert tone="info">Clé Google Maps non configurée — la carte est indisponible.</Alert>
        ) : showMap ? (
          <div className="space-y-2">
            <div
              ref={mapContainerRef}
              className="h-56 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-64"
              role="application"
              aria-label="Carte de localisation de l'activité"
            />
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {geoActive && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  Ma position
                </span>
              )}
              {venueLat != null && venueLng != null && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  Lieu activité
                </span>
              )}
              {sharing && liveLat != null && liveLng != null && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
                  Position partagée
                </span>
              )}
            </div>
          </div>
        ) : (
          <Alert tone="info">
            Activez le GPS de votre appareil pour afficher votre position sur la carte, ou ajoutez
            latitude/longitude lors de la création de l&apos;activité.
          </Alert>
        )}

        {activity.location ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0" />
            {activity.location}
          </p>
        ) : null}

        {canManage ? (
          <div className="space-y-3">
            {geoError && (
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  status === "denied"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-red-50 text-red-700",
                )}
              >
                {geoError}
              </div>
            )}

            {geoActive && location && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">Position actuelle :</span>{" "}
                {formatCoords(location.latitude, location.longitude)}
                {" · "}
                ± {Math.round(location.accuracy)} m
                {inRdc != null && (
                  <span className={inRdc ? " text-emerald-700" : " text-amber-700"}>
                    {" · "}
                    {inRdc ? "En RDC" : "Hors RDC"}
                  </span>
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={enabled ? "outline" : "primary"}
                size="sm"
                onClick={toggle}
                disabled={geoLoading || status === "unsupported"}
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche…
                  </>
                ) : enabled ? (
                  "Désactiver le GPS"
                ) : (
                  <>
                    <Crosshair className="mr-2 h-4 w-4" />
                    Activer ma position
                  </>
                )}
              </Button>

              {geoActive && (
                <Button type="button" variant="outline" size="sm" onClick={() => refresh()} disabled={geoLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              )}

              {!sharing ? (
                <Button type="button" size="sm" onClick={startSharing} loading={busy} disabled={!geoActive}>
                  <Navigation className="mr-2 h-4 w-4" />
                  Partager ma localisation
                </Button>
              ) : (
                <Button type="button" variant="danger" size="sm" onClick={stopSharing} loading={busy}>
                  Arrêter le partage
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

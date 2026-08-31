"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useDeviceLocation } from "@/lib/hooks/use-device-location";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps-config";
import type { Activity } from "@/lib/types";
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
  const mapRef = useRef<HTMLDivElement>(null);
  const { location, loading: geoLoading, refresh } = useDeviceLocation();
  const [sharing, setSharing] = useState(activity.live_location?.active ?? false);
  const [busy, setBusy] = useState(false);

  const venueLat = activity.latitude ?? null;
  const venueLng = activity.longitude ?? null;
  const liveLat = activity.live_location?.latitude ?? null;
  const liveLng = activity.live_location?.longitude ?? null;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return;
        const center = {
          lat: liveLat ?? venueLat ?? -4.3217,
          lng: liveLng ?? venueLng ?? 15.3125,
        };
        const map = new google.maps.Map(mapRef.current, { center, zoom: 14 });
        if (venueLat && venueLng) {
          new google.maps.Marker({
            map,
            position: { lat: venueLat, lng: venueLng },
            title: "Lieu de l'activité",
          });
        }
        if (liveLat && liveLng && sharing) {
          new google.maps.Marker({
            map,
            position: { lat: liveLat, lng: liveLng },
            title: "Responsable en route",
            icon: "http://maps.google.com/mapfiles/ms/icons blue-dot.png",
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [venueLat, venueLng, liveLat, liveLng, sharing]);

  async function startSharing() {
    if (!location) {
      toast.error("Activez la géolocalisation de votre appareil.");
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
        {(venueLat && venueLng) || (liveLat && liveLng) ? (
          <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-xl bg-slate-100" />
        ) : (
          <Alert tone="info">
            Aucune coordonnée GPS renseignée. Ajoutez latitude/longitude lors de la création de l&apos;activité.
          </Alert>
        )}

        {activity.location ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0" />
            {activity.location}
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => refresh()} disabled={geoLoading}>
              <Navigation className="mr-2 h-4 w-4" />
              Actualiser ma position
            </Button>
            {!sharing ? (
              <Button type="button" size="sm" onClick={startSharing} loading={busy}>
                Partager ma localisation en temps réel
              </Button>
            ) : (
              <Button type="button" variant="danger" size="sm" onClick={stopSharing} loading={busy}>
                Arrêter le partage
              </Button>
            )}
          </div>
        ) : sharing ? (
          <p className="text-sm text-brand-700">
            📍 Le responsable partage sa position en temps réel
            {activity.live_location?.shared_by ? ` (${activity.live_location.shared_by})` : ""}.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

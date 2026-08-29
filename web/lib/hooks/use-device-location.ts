"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isInRdc } from "@/lib/geo";

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  heading: number | null;
  speed: number | null;
}

export type DeviceLocationStatus =
  | "idle"
  | "loading"
  | "active"
  | "denied"
  | "unsupported"
  | "error";

const ERROR_MESSAGES: Record<number, string> = {
  1: "Accès à la position refusé. Autorisez la localisation dans les paramètres du navigateur.",
  2: "Position indisponible sur cet appareil.",
  3: "Délai dépassé lors de la recherche de position.",
};

export function useDeviceLocation() {
  const watchIdRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [status, setStatus] = useState<DeviceLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setEnabled(false);
    setStatus("idle");
  }, []);

  const activate = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    setError(null);
    setStatus("loading");
    setEnabled(true);

    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        setStatus("active");
        setError(
          isInRdc(latitude, longitude)
            ? null
            : "Votre position semble hors du territoire RDC — affichage conservé à titre indicatif.",
        );
      },
      (geoError) => {
        if (geoError.code === 1) {
          setStatus("denied");
        } else {
          setStatus("error");
        }
        setError(ERROR_MESSAGES[geoError.code] ?? geoError.message);
        setEnabled(false);
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 8_000,
        timeout: 20_000,
      },
    );
  }, []);

  const toggle = useCallback(() => {
    if (enabled) stop();
    else activate();
  }, [enabled, stop, activate]);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) return;
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        setStatus("active");
        setEnabled(true);
      },
      (geoError) => {
        setError(ERROR_MESSAGES[geoError.code] ?? geoError.message);
        setStatus(geoError.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  return {
    enabled,
    location,
    status,
    error,
    activate,
    stop,
    toggle,
    refresh,
    inRdc: location ? isInRdc(location.latitude, location.longitude) : null,
  };
}

"use client";

/// <reference path="../../types/digitalpersona.d.ts" />

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DIGITALPERSONA_LITE_CLIENT_URL,
  waitForDigitalPersona,
} from "@/components/fingerprint/digitalpersona-scripts";

export type DigitalPersonaReaderState =
  | "idle"
  | "loading"
  | "ready"
  | "capturing"
  | "unavailable"
  | "error";

export interface FingerprintSamplePayload {
  templateHash: string;
  rawSample: string;
  format: "hardware" | "simulated";
}

async function hashSample(raw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `sim-${Math.abs(hash).toString(16)}`;
}

export function useDigitalPersonaReader({
  active,
  onSample,
  onQualityProgress,
  onError,
}: {
  active: boolean;
  onSample: (payload: FingerprintSamplePayload) => void;
  onQualityProgress?: (percent: number) => void;
  onError?: (message: string) => void;
}) {
  const apiRef = useRef<Fingerprint.WebApi | null>(null);
  const capturingRef = useRef(false);
  const [state, setState] = useState<DigitalPersonaReaderState>("idle");
  const [deviceConnected, setDeviceConnected] = useState(false);

  const stopCapture = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !capturingRef.current) return;
    try {
      await api.stopAcquisition();
    } catch {
      /* ignore */
    }
    capturingRef.current = false;
    setState(deviceConnected ? "ready" : "unavailable");
  }, [deviceConnected]);

  const startCapture = useCallback(async () => {
    const api = apiRef.current;
    if (!api || capturingRef.current) return;
    try {
      await api.startAcquisition(Fingerprint.SampleFormat.Intermediate);
      capturingRef.current = true;
      setState("capturing");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de démarrer la capture.";
      setState("error");
      onError?.(message);
    }
  }, [onError]);

  useEffect(() => {
    if (!active) {
      void stopCapture();
      return;
    }

    let cancelled = false;

    async function init() {
      setState("loading");
      try {
        await waitForDigitalPersona();
        if (cancelled) return;

        const api = new Fingerprint.WebApi();
        apiRef.current = api;

        api.onDeviceConnected = () => {
          setDeviceConnected(true);
          setState("ready");
        };
        api.onDeviceDisconnected = () => {
          setDeviceConnected(false);
          setState("unavailable");
        };
        api.onCommunicationFailed = () => {
          setState("unavailable");
          onError?.(
            `Lecteur indisponible. Installez le HID Authentication Device Client : ${DIGITALPERSONA_LITE_CLIENT_URL}`,
          );
        };
        api.onQualityReported = (event: Fingerprint.QualityReported) => {
          if (event.quality === Fingerprint.QualityCode.Good) {
            onQualityProgress?.(Math.min(95, 85 + Math.random() * 10));
          }
        };
        api.onSamplesAcquired = async (event: Fingerprint.SamplesAcquired) => {
          try {
            const samples = JSON.parse(event.samples) as string[];
            const raw = samples[0] ?? event.samples;
            const templateHash = await hashSample(raw);
            onSample({ templateHash, rawSample: raw, format: "hardware" });
            onQualityProgress?.(100);
            await stopCapture();
          } catch (error) {
            onError?.(error instanceof Error ? error.message : "Échec lecture échantillon.");
          }
        };
        api.onErrorOccurred = () => {
          onError?.("Erreur du lecteur d'empreintes.");
        };

        const devices = await api.enumerateDevices();
        if (devices.length > 0) {
          setDeviceConnected(true);
          setState("ready");
          await startCapture();
        } else {
          setState("unavailable");
        }
      } catch (error) {
        if (cancelled) return;
        setState("unavailable");
        onError?.(error instanceof Error ? error.message : "SDK DigitalPersona non chargé.");
      }
    }

    void init();

    return () => {
      cancelled = true;
      void stopCapture();
      apiRef.current = null;
    };
  }, [active, onError, onQualityProgress, onSample, startCapture, stopCapture]);

  useEffect(() => {
    if (active && state === "ready" && !capturingRef.current) {
      void startCapture();
    }
    if (!active) {
      void stopCapture();
    }
  }, [active, startCapture, state, stopCapture]);

  return {
    state,
    deviceConnected,
    isHardware: state === "ready" || state === "capturing" || deviceConnected,
    restartCapture: startCapture,
  };
}

"use client";

import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";

export function QrScannerPanel({
  onScan,
  loading,
  placeholder = "JP-RDC-00000001 ou jeton QR",
}: {
  onScan: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!Detector) {
        setCameraError("Scan caméra indisponible sur ce navigateur. Saisissez l'identifiant manuellement.");
        return;
      }

      const detector = new Detector({ formats: ["qr_code"] });
      const loop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          requestAnimationFrame(loop);
          return;
        }
        const codes = await detector.detect(videoRef.current).catch(() => []);
        if (codes[0]?.rawValue) {
          stopCamera();
          onScan(codes[0].rawValue);
          return;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch {
      setCameraError("Impossible d'accéder à la caméra.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-950">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-44 rounded-xl border-2 border-gold-400/80 shadow-[0_0_0_999px_rgba(2,8,20,0.35)]" />
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
          Placez le QR code dans la zone
        </p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={() => void startCamera()}>
        <ScanLine className="h-4 w-4" />
        Activer la caméra
      </Button>
      {cameraError && <Alert tone="warning">{cameraError}</Alert>}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          wrapperClassName="flex-1"
        />
        <Button
          type="button"
          onClick={() => manual.trim() && onScan(manual.trim())}
          loading={loading}
          disabled={!manual.trim()}
        >
          Vérifier
        </Button>
      </div>
    </div>
  );
}

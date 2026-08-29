"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

const BRAND_DARK = "#072a40";

/** Construit la charge utile scannable (URL absolue si possible). */
export function resolveQrPayload(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (typeof window === "undefined") return trimmed;
  try {
    return new URL(trimmed, window.location.origin).toString();
  } catch {
    return trimmed;
  }
}

export function MemberQrCode({
  value,
  size = 120,
  label,
  className,
  compact = false,
}: {
  value: string | null | undefined;
  size?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const payload = resolveQrPayload(value);

    if (!payload) {
      setSrc(null);
      setFailed(false);
      return;
    }

    setFailed(false);
    void QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: Math.max(size * 2, 256),
      color: {
        dark: BRAND_DARK,
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm",
          compact ? "p-0.5" : "p-1",
        )}
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt={label ?? "QR code"} width={size} height={size} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[8px] text-slate-400">
            {failed ? "QR indisponible" : "…"}
          </div>
        )}
      </div>
      {label && (
        <p
          className={cn(
            "mt-1 text-center font-medium tracking-wide text-slate-500 uppercase",
            compact ? "text-[6px] leading-tight" : "text-[7px] leading-tight sm:text-[8px]",
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
}

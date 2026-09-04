"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/** Noir pur pour un contraste maximal au scan agent. */
const SCAN_DARK = "#000000";

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
  size = 160,
  label,
  className,
  compact = false,
  /** Affiche un cadre blanc plus généreux (scan plein écran / ma carte). */
  emphasize = false,
}: {
  value: string | null | undefined;
  size?: number;
  label?: string;
  className?: string;
  compact?: boolean;
  emphasize?: boolean;
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
      margin: emphasize ? 3 : compact ? 2 : 3,
      width: Math.max(size * 2, emphasize ? 512 : 320),
      color: {
        dark: SCAN_DARK,
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
  }, [value, size, compact, emphasize]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden border border-slate-200 bg-white",
          emphasize
            ? "rounded-2xl p-3 shadow-md ring-2 ring-brand-100"
            : compact
              ? "rounded-md p-1 shadow-sm"
              : "rounded-lg p-1.5 shadow-sm",
        )}
        style={{ width: size, height: size }}
      >
        {src ? (
          <img
            src={src}
            alt={label ?? "QR code"}
            width={size}
            height={size}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[8px] text-slate-400">
            {failed ? "QR indisponible" : "…"}
          </div>
        )}
      </div>
      {label && (
        <p
          className={cn(
            "mt-1 text-center font-semibold tracking-wide text-slate-600 uppercase",
            emphasize
              ? "text-xs"
              : compact
                ? "text-[6px] leading-tight"
                : "text-[8px] leading-tight sm:text-[9px]",
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
}

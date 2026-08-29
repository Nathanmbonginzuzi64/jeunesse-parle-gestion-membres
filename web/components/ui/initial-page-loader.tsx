"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** 1 → 100 en ~2,8 s (28 ms × 99 paliers). */
const TICK_MS = 28;

export function InitialPageLoader() {
  const [phase, setPhase] = useState<"loading" | "exit" | "hidden">("loading");
  const [progress, setProgress] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((current) => (current >= 100 ? 100 : current + 1));
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (progress < 100 || phase !== "loading") return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("exit");

    const hideTimer = window.setTimeout(() => setPhase("hidden"), 450);
    return () => clearTimeout(hideTimer);
  }, [progress, phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 transition-opacity duration-500",
        phase === "exit" && "pointer-events-none opacity-0",
      )}
      aria-live="polite"
      aria-busy={phase === "loading"}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="jp-float absolute left-[15%] top-[20%] h-40 w-40 rounded-full bg-brand-400/40 blur-3xl" />
        <div
          className="jp-float jp-float-delay absolute bottom-[18%] right-[12%] h-52 w-52 rounded-full bg-brand-300/30 blur-3xl"
          aria-hidden
        />
      </div>

      <div className="relative text-center">
        <div className="mx-auto w-[7.5rem] overflow-hidden rounded-2xl border-2 border-white/25 bg-white/10 p-2 shadow-2xl shadow-brand-900/40 backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="" className="aspect-square w-full rounded-xl object-cover" />
        </div>
        <p className="mt-5 text-sm font-semibold tracking-[0.22em] text-brand-100 uppercase">La Jeunesse Parle</p>
        <p className="mt-1 text-xs text-brand-200/80">Chargement de la plateforme…</p>
      </div>

      <div className="relative mt-10 w-full max-w-xs px-6">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-brand-900/40 ring-1 ring-white/10"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Progression du chargement"
        >
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-brand-300 via-brand-400 to-brand-200 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          >
            <span className="jp-progress-shine absolute inset-y-0 right-0 w-16" aria-hidden />
          </div>
        </div>
        <p className="mt-2 text-center text-sm font-semibold tabular-nums text-brand-50">{progress}%</p>
      </div>
    </div>
  );
}

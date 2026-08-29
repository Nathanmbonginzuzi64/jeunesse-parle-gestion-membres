"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 28;

export default function PublicLoading() {
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

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <div className="mx-auto h-3 w-32 rounded-full bg-brand-100" />
        <div className="h-8 rounded-xl bg-brand-50" />
        <div className="h-4 w-4/5 rounded-lg bg-brand-50" />
        <div className="h-4 w-3/5 rounded-lg bg-brand-50" />
      </div>
      <div className="mt-10 w-full max-w-xs">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-brand-100"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Chargement de la page"
        >
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          >
            <span className="jp-progress-shine absolute inset-y-0 right-0 w-16" aria-hidden />
          </div>
        </div>
        <p className="mt-3 text-center text-sm font-semibold tabular-nums text-brand-600">{progress}%</p>
      </div>
    </div>
  );
}

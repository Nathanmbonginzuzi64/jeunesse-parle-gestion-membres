"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TICK_MS = 28;
const MAX_WAIT_MS = 2500;

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(1);
  const [visible, setVisible] = useState(false);
  const waitingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const clearCounter = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
  }, []);

  const resumeCounter = useCallback(() => {
    waitingRef.current = false;
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
  }, []);

  const startCounter = useCallback(() => {
    clearCounter();
    waitingRef.current = false;
    setVisible(true);
    setProgress(1);

    intervalRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) return 100;
        if (waitingRef.current && current >= 99) return current;
        return current + 1;
      });
    }, TICK_MS);
  }, [clearCounter]);

  const beginNavigation = useCallback(() => {
    startCounter();
    waitingRef.current = true;

    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    waitTimeoutRef.current = setTimeout(resumeCounter, MAX_WAIT_MS);
  }, [startCounter, resumeCounter]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    resumeCounter();
  }, [routeKey, resumeCounter]);

  useEffect(() => {
    if (!visible || progress < 100) return;

    clearCounter();
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setProgress(1);
    }, 350);

    return () => clearTimeout(hideTimer);
  }, [progress, visible, clearCounter]);

  useEffect(() => {
    const onNavigate = () => beginNavigation();

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor?.href || anchor.target === "_blank" || anchor.download) return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}`;
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      if (next !== current) onNavigate();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onNavigate);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onNavigate);
    };
  }, [pathname, searchParams, beginNavigation]);

  useEffect(() => () => clearCounter(), [clearCounter]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999]">
      <div
        className="h-[3px] overflow-hidden bg-brand-100/80"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Chargement de la page"
      >
        <div
          className={cn(
            "relative h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300 shadow-[0_0_12px_rgba(0,135,209,0.65)] transition-[width] duration-100 ease-linear",
            progress >= 100 && "opacity-0 transition-opacity duration-300",
          )}
          style={{ width: `${progress}%` }}
        >
          <span className="jp-progress-shine absolute inset-y-0 right-0 w-24" aria-hidden />
        </div>
      </div>
      <p className="absolute right-3 top-2 text-[10px] font-semibold tabular-nums text-brand-600">{progress}%</p>
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}

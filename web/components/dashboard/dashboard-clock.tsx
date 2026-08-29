"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export function DashboardClock({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = formatTime(now);
  const [hours, minutes, seconds] = time.split(":");

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-lg border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm",
          className,
        )}
      >
        <p className="font-mono text-lg font-semibold leading-none tabular-nums text-white">
          {hours}
          <span className="jp-clock-colon mx-px text-brand-200">:</span>
          {minutes}
          <span className="jp-clock-colon mx-px text-brand-200">:</span>
          <span className="text-sm text-brand-100/90">{seconds}</span>
        </p>
        <p className="mt-0.5 text-[9px] font-medium tracking-wide text-brand-100/65 uppercase">
          Kinshasa
        </p>
      </div>
    );
  }

  const secondAngle = (Number(seconds) / 60) * 360;
  const minuteAngle = ((Number(minutes) + Number(seconds) / 60) / 60) * 360;
  const hourAngle = (((Number(hours) % 12) + Number(minutes) / 60) / 12) * 360;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="relative flex items-center gap-4">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
          <div className="absolute inset-0 rounded-full border border-white/20 bg-brand-900/30" />
          <span
            className="absolute left-1/2 top-1/2 h-[1.35rem] w-0.5 origin-bottom rounded-full bg-white/90"
            style={{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }}
            aria-hidden
          />
          <span
            className="absolute left-1/2 top-1/2 h-[1.65rem] w-0.5 origin-bottom rounded-full bg-brand-200"
            style={{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }}
            aria-hidden
          />
          <span
            className="absolute left-1/2 top-1/2 h-[1.85rem] w-px origin-bottom rounded-full bg-gold-400"
            style={{ transform: `translate(-50%, -100%) rotate(${secondAngle}deg)` }}
            aria-hidden
          />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-3xl font-semibold tabular-nums text-white">
            {hours}:{minutes}
            <span className="text-xl text-brand-100/90">:{seconds}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

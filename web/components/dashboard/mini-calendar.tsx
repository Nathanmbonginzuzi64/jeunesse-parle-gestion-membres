"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatMonthYear, getCalendarDays, TIMEZONE_RDC } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function MiniCalendar({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { day: today, cells } = getCalendarDays(now, TIMEZONE_RDC);
  const monthLabel = formatMonthYear(now, TIMEZONE_RDC);

  const todayIndex = cells.findIndex((c) => c.isToday);
  const weekStart = Math.floor(todayIndex / 7) * 7;
  const weekCells = compact ? cells.slice(weekStart, weekStart + 7) : cells;

  return (
    <div
      className={cn(
        "rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm",
        compact ? "px-2.5 py-2" : "p-4",
        className,
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", compact ? "mb-1.5" : "mb-3")}>
        <div className="flex items-center gap-1.5">
          <CalendarDays className={cn("text-brand-200", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          <p className={cn("font-semibold text-white", compact ? "text-[11px]" : "text-sm")}>
            {compact ? monthLabel.split(" ")[0] : monthLabel}
          </p>
        </div>
        <span className="rounded-full bg-gold-500/25 px-1.5 py-px text-[9px] font-semibold text-gold-300">
          {today}
        </span>
      </div>

      {compact ? (
        <div className="grid grid-cols-7 gap-0.5">
          {weekCells.map((cell, index) =>
            cell.day === null ? (
              <span key={`e-${index}`} className="h-5" aria-hidden />
            ) : (
              <span
                key={`d-${cell.day}`}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium tabular-nums",
                  cell.isToday ? "bg-gold-500 text-brand-950" : "text-white/80",
                )}
              >
                {cell.day}
              </span>
            ),
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-brand-100/70">
            {WEEKDAYS.map((label, i) => (
              <span key={`${label}-${i}`}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, index) =>
              cell.day === null ? (
                <span key={`empty-${index}`} className="aspect-square" aria-hidden />
              ) : (
                <span
                  key={`day-${cell.day}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-xs font-medium tabular-nums",
                    cell.isToday ? "bg-gold-500 text-brand-950" : "text-white/85",
                  )}
                >
                  {cell.day}
                </span>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

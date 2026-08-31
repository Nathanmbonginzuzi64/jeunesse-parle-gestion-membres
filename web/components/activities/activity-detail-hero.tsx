"use client";

import { CalendarDays, MapPin, Users } from "lucide-react";
import { ActivityCoverImage } from "@/components/activities/activity-cover-image";
import { ActivityStatusBadge } from "@/components/ui/badge";
import type { Activity } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils";

export function ActivityDetailHero({ activity }: { activity: Activity }) {
  const expected = activity.participants_count ?? 0;
  const present = activity.attendances_count ?? 0;
  const rate = expected ? Math.round((present / expected) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-card border border-brand-200/60 bg-white shadow-[var(--shadow-elevated)]">
      <div className="relative h-48 sm:h-56 md:h-64">
        <ActivityCoverImage
          url={activity.image_url}
          className="h-full w-full"
          iconClassName="h-16 w-16 text-white/30"
          placeholderClassName="h-full w-full bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-100/90">
                {activity.type_label}
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{activity.title}</h1>
              <p className="mt-1 font-mono text-xs text-brand-100/80">{activity.code}</p>
            </div>
            <ActivityStatusBadge status={activity.status} label={activity.status_label} />
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        <div className="bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Début
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(activity.starts_at)}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            Lieu
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{activity.location ?? "—"}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Users className="h-3.5 w-3.5" />
            Présences
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-slate-900">
            {formatNumber(present)} / {formatNumber(expected)}
            {expected > 0 && <span className="ml-1 text-brand-600">({rate} %)</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

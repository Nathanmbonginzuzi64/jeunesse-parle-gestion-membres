"use client";

import { Crosshair, Loader2, MapPinned, Navigation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { formatCoords } from "@/lib/geo";
import type { DeviceLocation, DeviceLocationStatus } from "@/lib/hooks/use-device-location";
import { cn, formatRelative } from "@/lib/utils";

export function DeviceLocationPanel({
  enabled,
  location,
  status,
  error,
  inRdc,
  onToggle,
  onRefresh,
  nearestProvince,
  onFocusProvince,
}: {
  enabled: boolean;
  location: DeviceLocation | null;
  status: DeviceLocationStatus;
  error: string | null;
  inRdc: boolean | null;
  onToggle: () => void;
  onRefresh: () => void;
  nearestProvince?: string | null;
  onFocusProvince?: () => void;
}) {
  const loading = status === "loading";
  const active = status === "active" && location;

  return (
    <Card className="overflow-hidden border-brand-100">
      <CardBody className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                active
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : "bg-brand-50 text-brand-600 ring-brand-100",
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Navigation className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Position de l&apos;appareil admin</p>
              <p className="text-xs text-slate-500">
                {active
                  ? "Localisation active — visible sur la carte"
                  : "Activez le GPS pour afficher votre position sur la cartographie"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {active && (
              <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={enabled ? "outline" : "primary"}
              onClick={onToggle}
              disabled={loading || status === "unsupported"}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recherche…
                </>
              ) : enabled ? (
                "Désactiver"
              ) : (
                <>
                  <Crosshair className="h-3.5 w-3.5" />
                  Activer ma position
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div
            className={cn(
              "border-b px-4 py-2.5 text-xs",
              status === "denied" ? "border-amber-100 bg-amber-50 text-amber-800" : "border-red-100 bg-red-50 text-red-700",
            )}
          >
            {error}
          </div>
        )}

        {active && location && (
          <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Coordonnées</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {formatCoords(location.latitude, location.longitude)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Précision</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                ± {Math.round(location.accuracy)} m
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Territoire</p>
              <p className={cn("mt-0.5 text-sm font-semibold", inRdc ? "text-emerald-700" : "text-amber-700")}>
                {inRdc ? "En RDC" : "Hors RDC"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Mise à jour</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatRelative(new Date(location.timestamp).toISOString())}
              </p>
            </div>
          </div>
        )}

        {active && nearestProvince && onFocusProvince && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-brand-50/40 px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <MapPinned className="h-3.5 w-3.5 text-brand-600" />
              Province la plus proche : <strong>{nearestProvince}</strong>
            </p>
            <Button type="button" size="sm" variant="ghost" className="text-brand-700" onClick={onFocusProvince}>
              Centrer sur la province
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

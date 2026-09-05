"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveLocationSharingBadge } from "@/components/activities/live-location-sharing-badge";
import { Crosshair, Loader2, MapPin, Navigation, RefreshCw, Search, Volume2, VolumeX, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Table, Td, Th, Tr, Pagination } from "@/components/ui/table";
import {
  isAdminActivityVoiceEnabled,
  setAdminActivityVoiceEnabled,
  speakAdmin,
} from "@/lib/admin-activity-voice";
import { api, ApiError } from "@/lib/api";
import { formatCoords } from "@/lib/geo";
import { useDeviceLocation } from "@/lib/hooks/use-device-location";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps-config";
import type { Activity } from "@/lib/types";
import { useClientPagination } from "@/lib/use-client-pagination";
import { cn, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const MEMBERS_EN_ROUTE_PER_PAGE = 10;

export interface MemberEnRoute {
  member_id: number | null;
  member_code: string | null;
  full_name: string | null;
  photo_url: string | null;
  card_number: string | null;
  structure: string | null;
  province: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  updated_at: string | null;
  arrived_at?: string | null;
  status?: "en_route" | "arrived";
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Maps")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Maps"));
    document.head.appendChild(script);
  });
}

function MemberEnRouteCard({
  member,
  onClose,
}: {
  member: MemberEnRoute;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar src={member.photo_url} name={member.full_name} size="lg" rounded="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {member.full_name ?? "Membre"}
              </p>
              <p className="font-mono text-xs text-slate-500">{member.member_code ?? "—"}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-400">N° carte</dt>
              <dd className="font-semibold text-slate-800">{member.card_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-400">Structure</dt>
              <dd className="font-semibold text-slate-800">{member.structure ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-400">Localisation</dt>
              <dd className="font-semibold text-slate-800">
                {[member.province, member.commune].filter(Boolean).join(" › ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-400">Position GPS</dt>
              <dd className="font-mono text-[11px] text-slate-700">
                {formatCoords(member.latitude, member.longitude)}
                {member.updated_at ? (
                  <span className="ml-2 font-sans text-slate-400">
                    · MAJ {formatDateTime(member.updated_at)}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function ActivityLiveLocationPanel({
  activity,
  canManage,
  onUpdated,
}: {
  activity: Activity;
  canManage: boolean;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const deviceMarkerRef = useRef<google.maps.Marker | null>(null);
  const deviceCircleRef = useRef<google.maps.Circle | null>(null);
  const venueMarkerRef = useRef<google.maps.Marker | null>(null);
  const liveMarkerRef = useRef<google.maps.Marker | null>(null);
  const memberMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const locationRef = useRef<ReturnType<typeof useDeviceLocation>["location"]>(null);
  const didFitRef = useRef(false);
  const prevEnabledRef = useRef(false);
  const selectedMemberIdRef = useRef<number | null>(null);
  const knownEnRouteIdsRef = useRef<Set<number>>(new Set());
  const announcedArrivalKeysRef = useRef<Set<string>>(new Set());
  const voiceSeededRef = useRef(false);

  const {
    enabled,
    location,
    status,
    error: geoError,
    activate,
    toggle,
    refresh,
    inRdc,
  } = useDeviceLocation();

  locationRef.current = location;

  const geoLoading = status === "loading";
  const geoActive = status === "active" && location != null;

  const [sharing, setSharing] = useState(activity.live_location?.active ?? false);
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [trackingMembers, setTrackingMembers] = useState(true);
  const [membersEnRoute, setMembersEnRoute] = useState<MemberEnRoute[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberEnRoute | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [adminVoiceOn, setAdminVoiceOn] = useState(true);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return membersEnRoute;
    return membersEnRoute.filter((m) => {
      const haystack = [
        m.full_name,
        m.member_code,
        m.card_number,
        m.structure,
        m.province,
        m.commune,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [membersEnRoute, memberSearch]);

  const membersPagination = useClientPagination(
    filteredMembers,
    MEMBERS_EN_ROUTE_PER_PAGE,
    `${activity.id}:${memberSearch.trim().toLowerCase()}`,
  );

  const venueLat = activity.latitude ?? null;
  const venueLng = activity.longitude ?? null;
  const liveLat = activity.live_location?.latitude ?? null;
  const liveLng = activity.live_location?.longitude ?? null;

  useEffect(() => {
    setSharing(activity.live_location?.active ?? false);
  }, [activity.live_location?.active]);

  useEffect(() => {
    setAdminVoiceOn(isAdminActivityVoiceEnabled());
  }, []);

  const hasMapPoints =
    geoActive ||
    (venueLat != null && venueLng != null) ||
    (sharing && liveLat != null && liveLng != null) ||
    membersEnRoute.length > 0;

  const showMapShell = Boolean(GOOGLE_MAPS_API_KEY);

  const loadMembersEnRoute = useCallback(async () => {
    try {
      const res = await api.get<{
        data: MemberEnRoute[];
        arrivals?: MemberEnRoute[];
        total: number;
      }>(`/activities/${activity.id}/members-en-route`);
      const list = res.data ?? [];
      const arrivals = res.arrivals ?? [];
      setMembersEnRoute(list);

      const selectedId = selectedMemberIdRef.current;
      if (selectedId != null) {
        const fresh = list.find((m) => m.member_id === selectedId) ?? null;
        setSelectedMember(fresh);
        if (!fresh) selectedMemberIdRef.current = null;
      }

      const currentIds = new Set(
        list.map((m) => m.member_id).filter((id): id is number => id != null),
      );

      if (!voiceSeededRef.current) {
        knownEnRouteIdsRef.current = currentIds;
        for (const a of arrivals) {
          if (a.member_id != null && a.arrived_at) {
            announcedArrivalKeysRef.current.add(`${a.member_id}:${a.arrived_at}`);
          }
        }
        voiceSeededRef.current = true;
      } else if (isAdminActivityVoiceEnabled()) {
        for (const m of list) {
          if (m.member_id == null) continue;
          if (!knownEnRouteIdsRef.current.has(m.member_id)) {
            const name = m.full_name ?? "Un membre";
            speakAdmin(`${name} est en route vers l'activité.`);
            toast.info(`${name} est en route`);
          }
        }
        for (const a of arrivals) {
          if (a.member_id == null || !a.arrived_at) continue;
          const key = `${a.member_id}:${a.arrived_at}`;
          if (announcedArrivalKeysRef.current.has(key)) continue;
          announcedArrivalKeysRef.current.add(key);
          const name = a.full_name ?? "Un membre";
          speakAdmin(`${name} est arrivé à l'activité.`);
          toast.success(`${name} est arrivé`);
        }
        knownEnRouteIdsRef.current = currentIds;
      } else {
        for (const m of list) {
          if (m.member_id == null) continue;
          if (!knownEnRouteIdsRef.current.has(m.member_id)) {
            toast.info(`${m.full_name ?? "Un membre"} est en route`);
          }
        }
        for (const a of arrivals) {
          if (a.member_id == null || !a.arrived_at) continue;
          const key = `${a.member_id}:${a.arrived_at}`;
          if (announcedArrivalKeysRef.current.has(key)) continue;
          announcedArrivalKeysRef.current.add(key);
          toast.success(`${a.full_name ?? "Un membre"} est arrivé`);
        }
        knownEnRouteIdsRef.current = currentIds;
      }
    } catch {
      /* ignore poll errors */
    }
  }, [activity.id, toast]);

  useEffect(() => {
    if (!canManage || !trackingMembers) return;
    loadMembersEnRoute();
    const timer = setInterval(loadMembersEnRoute, 2_000);
    return () => clearInterval(timer);
  }, [canManage, trackingMembers, loadMembersEnRoute]);

  useEffect(() => {
    if (!showMapShell) return;
    let cancelled = false;

    const boot = () => {
      if (cancelled || !mapContainerRef.current || !GOOGLE_MAPS_API_KEY) return;

      loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
        .then(() => {
          if (cancelled || !mapContainerRef.current || !window.google?.maps) return;

          if (!mapRef.current) {
            mapRef.current = new google.maps.Map(mapContainerRef.current, {
              center: { lat: -4.3217, lng: 15.3125 },
              zoom: 14,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
            });
            setMapReady(true);
          }

          requestAnimationFrame(() => {
            if (mapRef.current && window.google?.maps) {
              google.maps.event.trigger(mapRef.current, "resize");
            }
          });
        })
        .catch(() => undefined);
    };

    const frame = requestAnimationFrame(boot);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      deviceMarkerRef.current?.setMap(null);
      deviceCircleRef.current?.setMap(null);
      venueMarkerRef.current?.setMap(null);
      liveMarkerRef.current?.setMap(null);
      deviceMarkerRef.current = null;
      deviceCircleRef.current = null;
      venueMarkerRef.current = null;
      liveMarkerRef.current = null;
      for (const marker of memberMarkersRef.current.values()) {
        marker.setMap(null);
      }
      memberMarkersRef.current.clear();
      mapRef.current = null;
      setMapReady(false);
      didFitRef.current = false;
    };
  }, [showMapShell]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    deviceMarkerRef.current?.setMap(null);
    deviceCircleRef.current?.setMap(null);
    deviceMarkerRef.current = null;
    deviceCircleRef.current = null;

    if (!location || status !== "active") return;

    const position = { lat: location.latitude, lng: location.longitude };

    deviceMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position,
      title: "Ma position",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#10b981",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 3,
    });

    if (location.accuracy > 0) {
      deviceCircleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: position,
        radius: location.accuracy,
        fillColor: "#10b981",
        fillOpacity: 0.12,
        strokeColor: "#10b981",
        strokeOpacity: 0.35,
        strokeWeight: 1,
      });
    }
  }, [mapReady, location, status]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    venueMarkerRef.current?.setMap(null);
    venueMarkerRef.current = null;

    if (venueLat == null || venueLng == null) return;

    venueMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: venueLat, lng: venueLng },
      title: "Lieu de l'activité",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 2,
    });
  }, [mapReady, venueLat, venueLng]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    liveMarkerRef.current?.setMap(null);
    liveMarkerRef.current = null;

    if (!sharing || liveLat == null || liveLng == null) return;

    liveMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: liveLat, lng: liveLng },
      title: "Position partagée",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#0087d1",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 2,
    });
  }, [mapReady, liveLat, liveLng, sharing]);

  const selectMember = useCallback((m: MemberEnRoute) => {
    selectedMemberIdRef.current = m.member_id;
    setSelectedMember(m);
    if (mapRef.current && m.latitude != null && m.longitude != null) {
      mapRef.current.panTo({ lat: m.latitude, lng: m.longitude });
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 14, 15));
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;

    const map = mapRef.current;
    const seen = new Set<number>();

    for (const m of membersEnRoute) {
      if (m.member_id == null) continue;
      seen.add(m.member_id);
      const position = { lat: m.latitude, lng: m.longitude };
      let marker = memberMarkersRef.current.get(m.member_id);

      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position,
          title: m.full_name ?? "Membre",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 4,
        });
        marker.addListener("click", () => selectMember(m));
        memberMarkersRef.current.set(m.member_id, marker);
      } else {
        marker.setPosition(position);
        google.maps.event.clearListeners(marker, "click");
        marker.addListener("click", () => selectMember(m));
      }
    }

    for (const [id, marker] of memberMarkersRef.current) {
      if (!seen.has(id)) {
        marker.setMap(null);
        memberMarkersRef.current.delete(id);
      }
    }
  }, [mapReady, membersEnRoute, selectMember]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps || !location || status !== "active") return;

    if (enabled && !prevEnabledRef.current) {
      mapRef.current.setCenter({ lat: location.latitude, lng: location.longitude });
      mapRef.current.setZoom(15);
    }
    prevEnabledRef.current = enabled;
  }, [mapReady, enabled, location, status]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    if (location && status === "active") {
      bounds.extend({ lat: location.latitude, lng: location.longitude });
      count++;
    }
    if (venueLat != null && venueLng != null) {
      bounds.extend({ lat: venueLat, lng: venueLng });
      count++;
    }
    if (sharing && liveLat != null && liveLng != null) {
      bounds.extend({ lat: liveLat, lng: liveLng });
      count++;
    }
    for (const m of membersEnRoute) {
      bounds.extend({ lat: m.latitude, lng: m.longitude });
      count++;
    }

    if (count >= 2) {
      mapRef.current.fitBounds(bounds, 48);
    } else if (count === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(15);
    }
  }, [location, status, venueLat, venueLng, liveLat, liveLng, sharing, membersEnRoute]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    const id = requestAnimationFrame(() => {
      google.maps.event.trigger(map, "resize");
      if (!didFitRef.current && hasMapPoints) {
        fitAll();
        didFitRef.current = true;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [mapReady, fitAll, hasMapPoints]);

  useEffect(() => {
    if (!sharing || !canManage) return;

    const sync = () => {
      const loc = locationRef.current;
      if (!loc) return;
      api
        .post(`/activities/${activity.id}/live-location/update`, {
          latitude: loc.latitude,
          longitude: loc.longitude,
        })
        .catch(() => undefined);
    };

    sync();
    const timer = setInterval(sync, 3_000);
    return () => clearInterval(timer);
  }, [sharing, canManage, activity.id]);

  async function startSharing() {
    if (!location) {
      if (!enabled) activate();
      toast.error("Activez la géolocalisation de votre appareil, puis réessayez.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/activities/${activity.id}/live-location/start`, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setSharing(true);
      setTrackingMembers(true);
      toast.success("Localisation partagée — les membres sont notifiés.");
      onUpdated?.();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Partage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    setBusy(true);
    try {
      await api.post(`/activities/${activity.id}/live-location/stop`);
      setSharing(false);
      toast.success("Partage arrêté.");
      onUpdated?.();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function startTrackingMembers() {
    if (!enabled) activate();
    setTrackingMembers(true);
    didFitRef.current = false;
    loadMembersEnRoute().then(() => {
      didFitRef.current = false;
      fitAll();
      didFitRef.current = true;
    });
    toast.success("Suivi des membres en route activé.");
  }

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader
          title="Localisation GPS"
          description="Lieu, partage responsable et suivi en direct"
        />
        <CardBody className="space-y-4">
          {sharing ? (
            <LiveLocationSharingBadge
              title={canManage ? "Vous partagez votre position" : "Position partagée en direct"}
              subtitle={
                canManage
                  ? "Les membres peuvent suivre votre emplacement en temps réel."
                  : activity.live_location?.shared_by
                    ? `Signal diffusé par ${activity.live_location.shared_by}.`
                    : "Le responsable diffuse sa position GPS en temps réel."
              }
            />
          ) : null}

          {!GOOGLE_MAPS_API_KEY ? (
            <Alert tone="info">Clé Google Maps non configurée — la carte est indisponible.</Alert>
          ) : (
            <div className="space-y-2">
              <div
                ref={mapContainerRef}
                className="h-64 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-80"
                role="application"
                aria-label="Carte de localisation de l'activité"
              />
              {!hasMapPoints ? (
                <p className="text-xs text-slate-500">
                  Activez le GPS ou renseignez le lieu de l&apos;activité pour afficher des points sur la
                  carte.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                {geoActive && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    Ma position
                  </span>
                )}
                {venueLat != null && venueLng != null && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    Lieu activité
                  </span>
                )}
                {sharing && liveLat != null && liveLng != null && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
                    Position partagée
                  </span>
                )}
                {membersEnRoute.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                    Membres en route
                  </span>
                )}
              </div>
              {selectedMember ? (
                <MemberEnRouteCard
                  member={selectedMember}
                  onClose={() => {
                    selectedMemberIdRef.current = null;
                    setSelectedMember(null);
                  }}
                />
              ) : null}
            </div>
          )}

          {activity.location ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0" />
              {activity.location}
            </p>
          ) : null}

          {canManage ? (
            <div className="space-y-3">
              {geoError && (
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs",
                    status === "denied" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700",
                  )}
                >
                  {geoError}
                </div>
              )}

              {geoActive && location && (
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Position actuelle :</span>{" "}
                  {formatCoords(location.latitude, location.longitude)}
                  {" · "}± {Math.round(location.accuracy)} m
                  {inRdc != null && (
                    <span className={inRdc ? " text-emerald-700" : " text-amber-700"}>
                      {" · "}
                      {inRdc ? "En RDC" : "Hors RDC"}
                    </span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={enabled ? "outline" : "primary"}
                  size="sm"
                  onClick={toggle}
                  disabled={geoLoading || status === "unsupported"}
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recherche…
                    </>
                  ) : enabled ? (
                    "Désactiver le GPS"
                  ) : (
                    <>
                      <Crosshair className="mr-2 h-4 w-4" />
                      Activer ma position
                    </>
                  )}
                </Button>

                {geoActive && (
                  <Button type="button" variant="outline" size="sm" onClick={() => refresh()} disabled={geoLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualiser
                  </Button>
                )}

                <Button type="button" variant="outline" size="sm" onClick={startTrackingMembers}>
                  <Users className="mr-2 h-4 w-4" />
                  Suivre les membres
                </Button>

                <Button type="button" variant="outline" size="sm" onClick={fitAll}>
                  Recentrer la carte
                </Button>

                {!sharing ? (
                  <Button type="button" size="sm" onClick={startSharing} loading={busy} disabled={!geoActive}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Partager ma localisation
                  </Button>
                ) : (
                  <Button type="button" variant="danger" size="sm" onClick={stopSharing} loading={busy}>
                    Arrêter le partage
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {canManage && trackingMembers ? (
        <Card className="lg:col-span-3">
          <CardHeader
            title="Membres en route"
            description={`${filteredMembers.length} membre(s) affiché(s) sur ${membersEnRoute.length} en route — recherche et voix off disponibles`}
          />
          <CardBody className="space-y-3 p-5 pt-0 sm:p-5 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[16rem] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Rechercher un membre en route (nom, code, carte, structure…)"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = !adminVoiceOn;
                  setAdminVoiceOn(next);
                  setAdminActivityVoiceEnabled(next);
                  if (next) {
                    speakAdmin("Voix activée pour le suivi des membres en route.");
                  }
                }}
              >
                {adminVoiceOn ? (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Voix on
                  </>
                ) : (
                  <>
                    <VolumeX className="mr-2 h-4 w-4" />
                    Voix off
                  </>
                )}
              </Button>
            </div>

            {membersEnRoute.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Aucun membre ne partage sa position pour le moment.
              </p>
            ) : filteredMembers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Aucun membre ne correspond à « {memberSearch.trim()} ».
              </p>
            ) : (
              <div className="-mx-5 overflow-hidden border-t border-slate-200 sm:-mx-5">
                <Table className="min-w-[52rem]">
                  <thead>
                    <tr>
                      <Th>Membre</Th>
                      <Th>Statut</Th>
                      <Th>N° carte</Th>
                      <Th>Structure</Th>
                      <Th>Localisation</Th>
                      <Th>Position GPS</Th>
                      <Th>Mise à jour</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersPagination.slice.map((m, index) => {
                      const active = selectedMember?.member_id === m.member_id;
                      const rowIndex =
                        (membersPagination.page - 1) * membersPagination.perPage + index;
                      return (
                        <Tr
                          key={m.member_id ?? `${m.latitude}-${m.longitude}-${rowIndex}`}
                          className={cn(
                            "cursor-pointer border-l-2 border-l-transparent",
                            rowIndex % 2 === 1 && "bg-slate-50/40",
                            active && "border-l-amber-500 bg-amber-50/70 hover:bg-amber-50/70",
                          )}
                          onClick={() => selectMember(m)}
                        >
                          <Td>
                            <div className="flex items-center gap-3">
                              <span className="relative shrink-0">
                                <Avatar src={m.photo_url} name={m.full_name} size="sm" />
                                <span
                                  className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-white"
                                  title="En route"
                                  aria-hidden
                                >
                                  <Navigation className="h-2.5 w-2.5" />
                                </span>
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {m.full_name ?? "Membre"}
                                </p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {m.member_code ?? "—"}
                                </p>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            <Badge tone="warning" className="gap-1">
                              <Navigation className="h-3 w-3" aria-hidden />
                              En route
                            </Badge>
                          </Td>
                          <Td className="text-xs font-medium">{m.card_number ?? "—"}</Td>
                          <Td className="max-w-[12rem] truncate text-xs">{m.structure ?? "—"}</Td>
                          <Td className="max-w-[14rem] truncate text-xs text-slate-600">
                            {[m.province, m.commune].filter(Boolean).join(" › ") || "—"}
                          </Td>
                          <Td className="font-mono text-[11px] text-slate-600">
                            {formatCoords(m.latitude, m.longitude)}
                          </Td>
                          <Td className="whitespace-nowrap text-xs text-slate-500">
                            {m.updated_at ? formatDateTime(m.updated_at) : "—"}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
                <Pagination
                  page={membersPagination.page}
                  lastPage={membersPagination.lastPage}
                  total={membersPagination.total}
                  perPage={membersPagination.perPage}
                  onChange={membersPagination.setPage}
                  label="membres en route"
                />
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}

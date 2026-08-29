"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCheck, ExternalLink, X } from "lucide-react";
import { notificationLevelMeta } from "@/components/notifications/notification-level";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

export function NotificationsInboxPopover({
  open,
  onClose,
  unreadCount,
  onUnreadChange,
}: {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadChange?: (count: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Paginated<AppNotification>>("/notifications", {
        page: 1,
        per_page: 8,
      });
      setItems(response.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      return;
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      // Le bouton cloche porte data-notifications-trigger
      if ((event.target as HTMLElement | null)?.closest?.("[data-notifications-trigger]")) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function markOne(id: number) {
    const target = items.find((item) => item.id === id);
    if (!target || target.is_read) return;

    try {
      await api.post(`/notifications/${id}/read`);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        ),
      );
      onUnreadChange?.(Math.max(0, unreadCount - 1));
    } catch {
      /* silencieux */
    }
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
      onUnreadChange?.(0);
    } catch {
      /* silencieux */
    } finally {
      setMarkingAll(false);
    }
  }

  function openDetail(item: AppNotification) {
    setSelected({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() });
    if (!item.is_read) void markOne(item.id);
  }

  if (!open) return null;

  const detailMeta = selected ? notificationLevelMeta(selected.level) : null;
  const DetailIcon = detailMeta?.icon;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="animate-scale-in absolute top-full right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
        <div className="min-w-0">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </button>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Vous êtes à jour"}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[22rem] overflow-y-auto">
        {selected && detailMeta && DetailIcon ? (
          <div className="space-y-3 p-3.5">
            <div className={cn("rounded-lg border p-3", detailMeta.tone)}>
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70">
                  <DetailIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", detailMeta.chip)}>
                    {detailMeta.label}
                  </span>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{selected.title}</p>
                </div>
              </div>
            </div>
            {selected.body ? (
              <p className="text-xs leading-relaxed text-slate-600">{selected.body}</p>
            ) : (
              <p className="text-xs italic text-slate-400">Aucun message complémentaire.</p>
            )}
            <p className="text-[11px] text-slate-400">{formatRelative(selected.created_at)}</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="space-y-2 p-3.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            )}
            {error && <p className="px-3.5 py-6 text-center text-xs text-red-600">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="px-3.5 py-8 text-center text-xs text-slate-500">Aucune notification pour le moment.</p>
            )}
            {!loading && items.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const meta = notificationLevelMeta(item.level);
                  const Icon = meta.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(item)}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-slate-50",
                          !item.is_read && "bg-brand-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                            meta.tone,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("line-clamp-1 text-xs text-slate-900", !item.is_read && "font-semibold")}>
                              {item.title}
                            </p>
                            {!item.is_read && (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                            )}
                          </div>
                          {item.body && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.body}</p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400">{formatRelative(item.created_at)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {!selected && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            loading={markingAll}
            disabled={unreadCount === 0}
            onClick={() => void markAll()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout lire
          </Button>
          <Link
            href="/notifications"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            Voir tout
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

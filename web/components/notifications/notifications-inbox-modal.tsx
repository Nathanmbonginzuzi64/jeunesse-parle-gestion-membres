"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCheck, ExternalLink } from "lucide-react";
import { notificationLevelMeta } from "@/components/notifications/notification-level";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

export function NotificationsInboxModal({
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
        per_page: 12,
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

  function handleClose() {
    setSelected(null);
    onClose();
  }

  const detailMeta = selected ? notificationLevelMeta(selected.level) : null;
  const DetailIcon = detailMeta?.icon;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={selected ? selected.title : "Notifications"}
      description={
        selected
          ? "Détail de l'alerte"
          : unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Vous êtes à jour"
      }
      size="md"
      footer={
        selected ? (
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={markingAll}
              disabled={unreadCount === 0}
              onClick={() => void markAll()}
            >
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
            <Link
              href="/notifications"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Voir tout
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )
      }
    >
      {selected && detailMeta && DetailIcon ? (
        <div className="space-y-4">
          <div className={cn("flex items-start gap-3 rounded-xl border p-4", detailMeta.tone)}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-inset ring-black/5">
              <DetailIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase", detailMeta.chip)}>
                {detailMeta.label}
              </span>
              <p className="mt-2 text-base font-semibold text-slate-900">{selected.title}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Message</p>
            {selected.body ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.body}</p>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400">Aucun message complémentaire.</p>
            )}
          </div>

          <dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Type</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{selected.type.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reçue</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{formatDateTime(selected.created_at)}</dd>
              <dd className="text-[11px] text-slate-400">{formatRelative(selected.created_at)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <>
          {error && <Alert tone="error">{error}</Alert>}
          {loading && <PageLoader />}
          {!loading && !error && items.length === 0 && (
            <EmptyState
              title="Aucune notification"
              description="Les validations, cartes et activités apparaîtront ici."
            />
          )}
          {!loading && items.length > 0 && (
            <ul className="-mx-5 -my-4 divide-y divide-slate-100">
              {items.map((item) => {
                const meta = notificationLevelMeta(item.level);
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50/80",
                        !item.is_read && "bg-brand-50/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                          meta.tone,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm text-slate-900", !item.is_read && "font-semibold")}>
                            {item.title}
                          </p>
                          {!item.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Non lu" />
                          )}
                        </div>
                        {item.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">{formatRelative(item.created_at)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

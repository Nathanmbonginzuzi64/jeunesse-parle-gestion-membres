"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { notificationLevelMeta } from "@/components/notifications/notification-level";
import { resolveNotificationAction, categoryLabel } from "@/lib/notifications/catalog";
import type { AppNotification } from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

export function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: AppNotification | null;
  onClose: () => void;
}) {
  const meta = notification ? notificationLevelMeta(notification.level) : notificationLevelMeta("info");
  const Icon = meta.icon;
  const action = notification ? resolveNotificationAction(notification) : null;

  return (
    <Modal
      open={Boolean(notification)}
      onClose={onClose}
      title={notification?.title ?? "Notification"}
      description="Détail de l'alerte"
      size="md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {action ? (
            <Link href={action.href}>
              <Button>{action.label}</Button>
            </Link>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      }
    >
      {notification && (
        <div className="space-y-4">
          <div className={cn("flex items-start gap-3 rounded-xl border p-4", meta.tone)}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-inset ring-black/5">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase", meta.chip)}>
                  {meta.label}
                </span>
                {!notification.is_read && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Non lu
                  </span>
                )}
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">{notification.title}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Message</p>
            {notification.body ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notification.body}</p>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400">Aucun message complémentaire.</p>
            )}
          </div>

          <dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Catégorie</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{categoryLabel(notification.category)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Type</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{notification.type.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reçue</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{formatDateTime(notification.created_at)}</dd>
              <dd className="text-[11px] text-slate-400">{formatRelative(notification.created_at)}</dd>
            </div>
            {notification.read_at && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lue le</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{formatDateTime(notification.read_at)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Modal>
  );
}

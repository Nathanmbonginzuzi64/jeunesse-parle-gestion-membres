"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, Fingerprint, IdCard, KeyRound, LogOut, Menu, MessageSquare, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationsInboxPopover } from "@/components/notifications/notifications-inbox-popover";
import { useNotificationFeed } from "@/lib/hooks/use-notification-feed";
import { useJpUnread } from "@/lib/hooks/use-jp-unread";
import { USE_MOCKS } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CommandSearch } from "./command-search";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const { unreadCount: unread, setUnreadCount, refreshCount } = useNotificationFeed();
  const { count: jpUnread } = useJpUnread();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onRefresh = () => void refreshCount();
    window.addEventListener("jp:notifications", onRefresh);
    return () => window.removeEventListener("jp:notifications", onRefresh);
  }, [refreshCount]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white px-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 md:block">
        <CommandSearch />
      </div>

      <div className="min-w-0 flex-1 md:hidden">
        {user?.scope?.province && (
          <p className="truncate text-xs text-slate-500">
            {user.scope.province}
            {user.scope.city ? ` · ${user.scope.city}` : ""}
          </p>
        )}
      </div>

      {USE_MOCKS && (
        <span className="hidden rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-900 ring-1 ring-gold-500/40 sm:inline-flex">
          Mode design
        </span>
      )}

      <Link
        href="/a-propos"
        className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 xl:inline-flex"
        aria-label="Aide"
      >
        <CircleHelp className="h-5 w-5" />
      </Link>

      <Link
        href="/jp-message"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label={`JP Message${jpUnread > 0 ? ` (${jpUnread} non lus)` : ""}`}
      >
        <MessageSquare className="h-5 w-5" />
        {jpUnread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
            {jpUnread > 99 ? "99+" : jpUnread}
          </span>
        )}
      </Link>

      <div className="relative">
        <button
          type="button"
          data-notifications-trigger
          onClick={() => {
            setMenuOpen(false);
            setNotificationsOpen((value) => !value);
          }}
          className={cn(
            "relative rounded-lg p-2 text-slate-600 hover:bg-slate-100",
            notificationsOpen && "bg-slate-100 text-brand-700",
          )}
          aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flag-red px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        <NotificationsInboxPopover
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          unreadCount={unread}
          onUnreadChange={setUnreadCount}
        />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex max-w-[14rem] items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-slate-100 sm:max-w-[18rem]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Avatar src={user?.photo_url} name={user?.name} size="sm" />
          <span className="min-w-0 text-left">
            <span className="block truncate text-xs font-medium text-slate-900">
              {user?.name}
            </span>
            <span className="mt-0.5 inline-flex max-w-full items-center truncate rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800 ring-1 ring-brand-100">
              {user?.role?.name ?? "Profil"}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", menuOpen && "rotate-180")}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="animate-scale-in absolute right-0 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[var(--shadow-elevated)]"
          >
            <div className="border-b border-slate-100 px-3.5 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-100">
                {user?.role?.name ?? "Profil"}
              </p>
              {(user?.scope?.province || user?.scope?.structure) && (
                <p className="mt-1.5 truncate text-[11px] text-slate-500">
                  {[user.scope.structure, user.scope.city, user.scope.province].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <Link
              href="/parametres/profil"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4 text-slate-400" />
              Mon profil
            </Link>
            <Link
              href="/parametres"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Paramètres
            </Link>
            <Link
              href="/jp-message"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <MessageSquare className="h-4 w-4 text-slate-400" />
              JP Message
            </Link>
            {user?.member_id && (
              <Link
                href="/mon-espace"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <IdCard className="h-4 w-4 text-slate-400" />
                Mon espace membre
              </Link>
            )}
            <Link
              href="/parametres/securite"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-slate-400" />
              Sécurité
            </Link>
            <Link
              href="/parametres/biometrie"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Fingerprint className="h-4 w-4 text-slate-400" />
              Biométrie
            </Link>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

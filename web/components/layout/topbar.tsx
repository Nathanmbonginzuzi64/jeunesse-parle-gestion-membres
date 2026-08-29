"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, KeyRound, LogOut, Menu, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationsInboxModal } from "@/components/notifications/notifications-inbox-modal";
import { api } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CommandSearch } from "./command-search";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get<{ count: number }>("/notifications/unread-count")
        .then((response) => active && setUnread(response.count))
        .catch(() => undefined);
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
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

      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setNotificationsOpen(true);
        }}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
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

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-slate-100"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Avatar src={user?.photo_url} name={user?.name} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block max-w-[10rem] truncate text-xs font-medium text-slate-900">
              {user?.name}
            </span>
            <span className="block max-w-[10rem] truncate text-[11px] text-slate-500">
              {user?.role?.name}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform", menuOpen && "rotate-180")}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="animate-scale-in absolute right-0 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[var(--shadow-elevated)]"
          >
            {user?.member_id && (
              <Link
                href="/mon-espace"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                Mon espace membre
              </Link>
            )}
            <Link
              href="/compte/mot-de-passe"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-slate-400" />
              Changer mon mot de passe
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

      <NotificationsInboxModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        unreadCount={unread}
        onUnreadChange={setUnread}
      />
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

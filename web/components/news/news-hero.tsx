"use client";

import { Bell, Newspaper, Search } from "lucide-react";
import Link from "next/link";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Input } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface NewsHeroProps {
  search: string;
  onSearchChange: (value: string) => void;
  unreadNotifications?: number;
}

export function NewsHero({ search, onSearchChange, unreadNotifications = 0 }: NewsHeroProps) {
  const { user } = useAuth();
  const canManage =
    user?.permissions?.includes(PERMISSIONS.activitiesManage) ||
    user?.permissions?.includes(PERMISSIONS.notificationsSend);

  return (
    <DashboardAnimate>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-blue-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-100">Jeunesse Parle 🇨🇩</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Actualités</h1>
            <p className="mt-2 max-w-lg text-sm text-brand-100/90">
              Informations, annonces et opportunités pour la jeunesse congolaise.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <Link
                href="/actualites/gestion"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              >
                <Newspaper className="h-4 w-4" />
                Administration
              </Link>
            ) : null}
            <Link
              href="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition hover:bg-white/25"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher une actualité…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-0 bg-white pl-10 text-slate-900 shadow-md"
          />
        </div>
      </div>
    </DashboardAnimate>
  );
}

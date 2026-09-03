"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  SETTINGS_GROUP_LABELS,
  visibleSettingsNav,
  type SettingsNavItem,
} from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

export function SettingsShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const items = visibleSettingsNav(user, can);

  const groups = (["personnel", "perimetre", "administration"] as const)
    .map((group) => ({
      group,
      label: SETTINGS_GROUP_LABELS[group],
      items: items.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  const isHubIndex = pathname === "/parametres" || pathname === "/parametres/";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Settings className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {title ?? "Paramètres"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {description ??
                "Centre de contrôle personnel et administratif de Jeunesse Parle."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)]">
        <aside className={cn("space-y-4", !isHubIndex && "hidden lg:block")}>
          {groups.map((entry) => (
            <div key={entry.group}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {entry.label}
              </p>
              <nav className="space-y-1" aria-label={entry.label}>
                {entry.items.map((item) => (
                  <SettingsNavLink key={item.id} item={item} pathname={pathname} />
                ))}
              </nav>
            </div>
          ))}
        </aside>

        <div className={cn(isHubIndex && "lg:col-span-1")}>
          {!isHubIndex ? (
            <div className="mb-4 lg:hidden">
              <Link
                href="/parametres"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                ← Toutes les catégories
              </Link>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function SettingsNavLink({ item, pathname }: { item: SettingsNavItem; pathname: string }) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href !== "/parametres/administration" && pathname.startsWith(`${item.href}/`)) ||
    (item.id === "administration" &&
      pathname.startsWith("/parametres/administration") &&
      pathname !== "/parametres/administration/systeme");

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition",
        active
          ? "bg-brand-50 text-brand-900 ring-1 ring-brand-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-brand-700" : "text-slate-400")} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block text-[11px] text-slate-400">{item.description}</span>
      </span>
    </Link>
  );
}

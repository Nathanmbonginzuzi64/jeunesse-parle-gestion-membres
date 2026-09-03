"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { SETTINGS_GROUP_LABELS, visibleSettingsNav } from "@/lib/settings/nav";

export default function ParametresIndexPage() {
  const { user, can } = useAuth();
  const items = visibleSettingsNav(user, can);

  const groups = (["personnel", "perimetre", "administration"] as const)
    .map((group) => ({
      group,
      label: SETTINGS_GROUP_LABELS[group],
      items: items.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <div className="space-y-6">
      <p className="hidden text-sm text-slate-500 lg:block">
        Sélectionnez une catégorie dans le menu de gauche, ou utilisez les raccourcis ci-dessous.
      </p>
      {groups.map((entry) => (
        <section key={entry.group} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{entry.label}</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0 sm:bg-slate-100 lg:grid-cols-3">
            {entry.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="bg-white">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

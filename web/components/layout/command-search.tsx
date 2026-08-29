"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Users, CalendarDays, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";

interface SearchHit {
  type: "member" | "activity" | "structure";
  id: string | number;
  title: string;
  subtitle?: string;
  href: string;
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(q, 280);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data: SearchHit[] }>("/search", { q: debounced })
      .then((response) => {
        if (!cancelled) setHits(response.data);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const grouped = useMemo(() => {
    const labels = { member: "Membres", activity: "Activités", structure: "Structures" };
    const icons = { member: Users, activity: CalendarDays, structure: Building2 };
    return (["member", "activity", "structure"] as const)
      .map((type) => ({
        type,
        label: labels[type],
        Icon: icons[type],
        items: hits.filter((hit) => hit.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [hits]);

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-md flex-1">
      <label className="sr-only" htmlFor="global-search">
        Recherche globale
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id="global-search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un membre, une activité…"
        className="h-10 w-full rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
      {open && (q.trim().length >= 2 || loading) && (
        <div className="animate-scale-in absolute top-[calc(100%+6px)] left-0 z-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-elevated)]">
          {loading && <p className="px-3 py-3 text-xs text-slate-500">Recherche…</p>}
          {!loading && hits.length === 0 && (
            <p className="px-3 py-3 text-xs text-slate-500">Aucun résultat pour « {q} ».</p>
          )}
          {!loading &&
            grouped.map((group) => (
              <div key={group.type} className="border-b border-slate-100 last:border-0">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.label}
                </p>
                {group.items.map((hit) => (
                  <Link
                    key={`${hit.type}-${hit.id}`}
                    href={hit.href}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50"
                  >
                    <group.Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-900">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="block truncate text-[11px] text-slate-500">{hit.subtitle}</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

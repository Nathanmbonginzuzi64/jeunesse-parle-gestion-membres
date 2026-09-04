"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  ScanLine,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import type { AgentPresentsFeed } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function formatDayLabel(date: string) {
  if (date === "inconnu") return "Date inconnue";
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function AgentPresentsPanel() {
  const [page, setPage] = useState(1);
  const [mineOnly, setMineOnly] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, mineOnly]);

  const query = useMemo(
    () => ({
      page,
      per_page: 20,
      mine_only: mineOnly ? 1 : 0,
      q: debouncedQ || undefined,
    }),
    [page, mineOnly, debouncedQ],
  );
  const feed = useApi<AgentPresentsFeed>("/attendance/agent-presents", query, {
    refreshInterval: 5_000,
  });

  const ongoing = feed.data?.ongoing ?? [];
  const byDate = feed.data?.by_date ?? [];
  const meta = feed.data?.meta;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Présents scannés"
          description="Liste avancée avec recherche et détail membre"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/presences/liste">
                <Button size="sm" variant="outline">
                  Liste pro
                </Button>
              </Link>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(event) => {
                    setMineOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-slate-300"
                />
                Mes scans uniquement
              </label>
            </div>
          }
        />
        <CardBody className="space-y-5">
          <Input
            type="search"
            placeholder="Rechercher un présent (nom, code JP-RDC)…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />

          {feed.error ? <Alert tone="danger">{feed.error}</Alert> : null}
          {feed.loading && !feed.data ? <TableSkeleton rows={4} /> : null}

          {ongoing.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Événement en cours</h3>
              {ongoing.map((block) => (
                <div
                  key={block.activity.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{block.activity.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Badge tone="success">{block.activity.status_label ?? "En cours"}</Badge>
                        </span>
                        {block.activity.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {block.activity.location}
                          </span>
                        ) : null}
                        {block.activity.starts_at ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDateTime(block.activity.starts_at)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/presences/${block.activity.id}`}>
                        <Button size="sm" variant="outline">
                          Feuille
                        </Button>
                      </Link>
                      <Link href={`/scan?activity=${block.activity.id}`}>
                        <Button size="sm">
                          <ScanLine className="h-4 w-4" />
                          Scanner un autre
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-medium text-emerald-800">
                    <UserCheck className="mr-1 inline h-3.5 w-3.5" />
                    {block.present_count} présent(s) scanné(s)
                  </p>

                  {block.presents.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Aucun scan encore sur cet événement.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-emerald-100/80 rounded-lg border border-emerald-100 bg-white">
                      {block.presents.map((row) => (
                        <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                          <Avatar
                            src={row.member?.photo_url}
                            name={row.member?.full_name}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {row.member?.full_name ?? "Membre"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {row.member?.member_code ?? "—"}
                              {row.member?.structure ? ` · ${row.member.structure}` : ""}
                              {row.method ? ` · ${row.method}` : ""}
                              {row.recorded_at ? ` · ${formatDateTime(row.recorded_at)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone="success">{row.status_label ?? "Présent"}</Badge>
                            {row.member?.id ? (
                              <Link
                                href={`/membres/${row.member.id}`}
                                className="text-[11px] font-medium text-brand-700 hover:underline"
                              >
                                Détail
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Par date</h3>
            {!feed.loading && byDate.length === 0 ? (
              <EmptyState
                title="Aucun présent scanné"
                description="Les membres pointés apparaîtront ici, regroupés par jour."
              />
            ) : null}
            {byDate.map((group) => (
              <div key={group.date} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {formatDayLabel(group.date)}
                </p>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {group.items.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar
                        src={row.member?.photo_url}
                        name={row.member?.full_name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {row.member?.full_name ?? "Membre"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {row.member?.member_code ?? "—"}
                          {row.activity?.title ? ` · ${row.activity.title}` : ""}
                          {row.recorded_at ? ` · ${formatDateTime(row.recorded_at)}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="success">{row.status_label ?? "Présent"}</Badge>
                        {row.member?.id ? (
                          <Link
                            href={`/membres/${row.member.id}`}
                            className="text-[11px] font-medium text-brand-700 hover:underline"
                          >
                            Détail
                          </Link>
                        ) : row.activity?.id ? (
                          <Link
                            href={`/presences/${row.activity.id}`}
                            className="text-[11px] font-medium text-brand-700 hover:underline"
                          >
                            Feuille
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {meta ? (
            <Pagination
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              perPage={meta.per_page}
              onChange={setPage}
              label="présences"
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

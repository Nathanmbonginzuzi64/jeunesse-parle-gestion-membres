"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { AgentPresentsFeed } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function AdvancedPresentsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceView}>
      <AdvancedPresentsTool />
    </RequirePermission>
  );
}

function AdvancedPresentsTool() {
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
      per_page: 30,
      mine_only: mineOnly ? 1 : 0,
      q: debouncedQ || undefined,
    }),
    [page, mineOnly, debouncedQ],
  );

  const feed = useApi<AgentPresentsFeed>("/attendance/agent-presents", query, {
    refreshInterval: 5_000,
  });

  const rows = feed.data?.data ?? [];
  const meta = feed.data?.meta;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/presences", label: "Présences" },
          { label: "Liste avancée" },
        ]}
      />

      <Card>
        <CardHeader
          title="Liste de présence pro"
          description="Recherche, historique détaillé et accès fiche membre"
          action={
            <Link href="/presences">
              <Button size="sm" variant="outline">
                Hub présences
              </Button>
            </Link>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                type="search"
                placeholder="Rechercher un présent…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(event) => setMineOnly(event.target.checked)}
                className="rounded border-slate-300"
              />
              Mes scans uniquement
            </label>
          </div>

          {feed.error ? <Alert tone="danger">{feed.error}</Alert> : null}
          {feed.loading && rows.length === 0 ? <TableSkeleton rows={6} /> : null}
          {!feed.loading && rows.length === 0 ? (
            <EmptyState
              title="Aucune présence"
              description="Les pointages enregistrés apparaîtront ici."
              icon={ListChecks}
            />
          ) : null}

          {rows.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar
                    src={row.member?.photo_url}
                    name={row.member?.full_name ?? "Membre"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.member?.full_name ?? "Membre"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {row.member?.member_code ?? "—"}
                      {row.activity?.title ? ` · ${row.activity.title}` : ""}
                      {row.method ? ` · ${row.method}` : ""}
                      {row.recorded_at ? ` · ${formatDateTime(row.recorded_at)}` : ""}
                    </p>
                  </div>
                  <Badge tone="success">{row.status_label ?? "Présent"}</Badge>
                  <div className="flex gap-2">
                    {row.member?.id ? (
                      <Link href={`/membres/${row.member.id}`}>
                        <Button size="sm" variant="outline">
                          Membre
                        </Button>
                      </Link>
                    ) : null}
                    {row.activity?.id ? (
                      <Link href={`/presences/${row.activity.id}`}>
                        <Button size="sm" variant="outline">
                          Feuille
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

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

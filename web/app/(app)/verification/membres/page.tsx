"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
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
import type { Paginated } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type VerifiedMember = {
  member_id: number;
  member_code: string | null;
  full_name: string | null;
  photo_url?: string | null;
  structure?: string | null;
  verifications_count: number;
  last_verified_at: string | null;
  last_context?: string | null;
};

export default function VerifiedMembersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsVerify}>
      <VerifiedMembersTool />
    </RequirePermission>
  );
}

function VerifiedMembersTool() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const feed = useApi<{ data: VerifiedMember[]; meta: Paginated<unknown>["meta"] }>(
    "/verifications/members",
    { page, per_page: 25, q: debouncedQ || undefined },
    { refreshInterval: 2_500 },
  );

  const rows = feed.data?.data ?? [];
  const meta = feed.data?.meta;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/verification", label: "Vérification" },
          { label: "Membres vérifiés" },
        ]}
      />

      <Card>
        <CardHeader
          title="Membres déjà vérifiés"
          description="Liste distincte des membres validés, avec recherche"
          action={
            <Link href="/verification">
              <Button size="sm" variant="outline">
                Nouvelle vérification
              </Button>
            </Link>
          }
        />
        <CardBody className="space-y-4">
          <Input
            type="search"
            placeholder="Rechercher par nom ou code JP-RDC…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />

          {feed.error ? <Alert tone="danger">{feed.error}</Alert> : null}
          {feed.loading && rows.length === 0 ? <TableSkeleton rows={6} /> : null}
          {!feed.loading && rows.length === 0 ? (
            <EmptyState
              title="Aucun membre vérifié"
              description="Les contrôles réussis apparaîtront ici."
              icon={Users}
            />
          ) : null}

          {rows.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {rows.map((row) => (
                <li key={row.member_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar src={row.photo_url} name={row.full_name ?? "Membre"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.full_name ?? "Membre"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {row.member_code ?? "—"}
                      {row.structure ? ` · ${row.structure}` : ""}
                      {row.last_verified_at
                        ? ` · ${formatDateTime(row.last_verified_at)}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone="success">{row.verifications_count} vérif.</Badge>
                  <Link href={`/membres/${row.member_id}`}>
                    <Button size="sm" variant="outline">
                      Détail
                    </Button>
                  </Link>
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
              label="membres"
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Edit3, Users } from "lucide-react";
import { Can } from "@/components/auth/require-permission";
import { structureTypeLabel } from "@/components/structures/structures-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/permissions";
import type { Paginated, Structure } from "@/lib/types";

export function StructuresTable({
  data,
  onEdit,
  onPageChange,
}: {
  data: Paginated<Structure>;
  onEdit: (structure: Structure) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Structure</Th>
            <Th>Type</Th>
            <Th>Localisation</Th>
            <Th>Responsable</Th>
            <Th>Membres</Th>
            <Th>Statut</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((structure) => (
            <Tr key={structure.id}>
              <Td>
                <p className="font-medium text-slate-900">{structure.name}</p>
                <p className="font-mono text-[11px] text-brand-700">{structure.code}</p>
              </Td>
              <Td className="text-xs text-slate-600">{structureTypeLabel(structure.type)}</Td>
              <Td className="text-xs text-slate-600">
                {structure.province?.name}
                {structure.city ? ` · ${structure.city.name}` : ""}
                {structure.commune ? ` · ${structure.commune.name}` : ""}
              </Td>
              <Td className="text-xs">{structure.leader?.full_name ?? "—"}</Td>
              <Td className="font-semibold tabular-nums text-brand-700">{structure.members_count ?? 0}</Td>
              <Td>
                <Badge tone={structure.is_active ? "success" : "neutral"}>
                  {structure.is_active ? "Active" : "Inactive"}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Link href={`/membres?structure_id=${structure.id}`}>
                    <Button variant="ghost" size="sm">
                      <Users className="h-3.5 w-3.5" />
                      Membres
                    </Button>
                  </Link>
                  <Can permission={PERMISSIONS.structuresManage}>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(structure)}>
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  </Can>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        page={data.meta.current_page}
        lastPage={data.meta.last_page}
        total={data.meta.total}
        perPage={data.meta.per_page}
        onChange={onPageChange}
        label="structures"
      />
    </>
  );
}

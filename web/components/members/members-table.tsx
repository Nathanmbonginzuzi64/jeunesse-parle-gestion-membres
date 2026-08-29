"use client";

import Link from "next/link";
import { ExternalLink, Eye, Mail, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { Can } from "@/components/auth/require-permission";
import { Avatar } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { PERMISSIONS } from "@/lib/permissions";
import type { Member } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

export function MembersTable({
  members,
  selected,
  sort,
  direction,
  busyId,
  onToggleAll,
  onToggleOne,
  onSort,
  onPreview,
  onEdit,
  onDelete,
}: {
  members: Member[];
  selected: number[];
  sort: string;
  direction: "asc" | "desc";
  busyId?: number | null;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: number, checked: boolean) => void;
  onSort: (column: string) => void;
  onPreview: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const allSelected = Boolean(members.length && selected.length === members.length);

  return (
    <>
      {/* Mobile */}
      <div className="divide-y divide-slate-100 md:hidden">
        {members.map((member) => (
          <article key={member.id} className="p-4 transition hover:bg-brand-50/30">
            <button
              type="button"
              onClick={() => onPreview(member)}
              className="flex w-full items-start gap-3 text-left"
            >
              <Avatar src={member.photo_url} name={member.full_name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{member.full_name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-brand-700">{member.member_code}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {member.province?.name && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {member.province.name}
                    </span>
                  )}
                  {member.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </span>
                  )}
                </span>
              </span>
              <MemberStatusBadge status={member.status} label={member.status_label} />
            </button>
            <MemberRowActions
              member={member}
              busy={busyId === member.id}
              className="mt-3 justify-end border-t border-slate-100 pt-3"
              onPreview={onPreview}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </article>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table className="min-w-[64rem]">
          <thead>
            <tr className="bg-gradient-to-r from-brand-50/90 to-slate-50">
              <Th className="w-10 rounded-tl-lg border-b-brand-100 bg-transparent">
                <Checkbox
                  label="Tout sélectionner"
                  className="sr-only [&_label]:sr-only"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                />
              </Th>
              <Th className="min-w-[15rem] border-b-brand-100 bg-transparent">Membre</Th>
              <Th
                sortable
                active={sort === "member_code"}
                direction={direction}
                onSort={() => onSort("member_code")}
                className="border-b-brand-100 bg-transparent"
              >
                Identifiant
              </Th>
              <Th className="border-b-brand-100 bg-transparent">Contact</Th>
              <Th className="border-b-brand-100 bg-transparent">Territoire</Th>
              <Th className="border-b-brand-100 bg-transparent">Structure</Th>
              <Th
                sortable
                active={sort === "status"}
                direction={direction}
                onSort={() => onSort("status")}
                className="border-b-brand-100 bg-transparent"
              >
                Statut
              </Th>
              <Th
                sortable
                active={sort === "created_at"}
                direction={direction}
                onSort={() => onSort("created_at")}
                className="border-b-brand-100 bg-transparent"
              >
                Inscription
              </Th>
              <Th className="w-36 rounded-tr-lg border-b-brand-100 bg-transparent text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <Tr
                key={member.id}
                className={cn(
                  "group cursor-pointer border-l-2 border-l-transparent hover:border-l-brand-500 hover:bg-brand-50/40",
                  index % 2 === 1 && "bg-slate-50/40",
                  selected.includes(member.id) && "bg-brand-50/60 border-l-brand-400",
                )}
                onClick={() => onPreview(member)}
              >
                <Td onClick={(e) => e.stopPropagation()} className="py-3.5">
                  <Checkbox
                    label={member.full_name}
                    className="[&_label]:sr-only"
                    checked={selected.includes(member.id)}
                    onChange={(e) => onToggleOne(member.id, e.target.checked)}
                  />
                </Td>
                <Td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.photo_url} name={member.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{member.full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[member.gender_label, member.age ? `${member.age} ans` : null, member.profession]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="py-3.5">
                  <span className="inline-flex rounded-md bg-brand-50 px-2 py-1 font-mono text-[11px] font-medium text-brand-800 ring-1 ring-inset ring-brand-100">
                    {member.member_code}
                  </span>
                </Td>
                <Td className="py-3.5">
                  <div className="space-y-0.5 text-xs text-slate-600">
                    {member.phone ? (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {member.phone}
                      </p>
                    ) : (
                      <p className="text-slate-400">—</p>
                    )}
                    {member.email && (
                      <p className="flex max-w-[10rem] items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {member.email}
                      </p>
                    )}
                  </div>
                </Td>
                <Td className="py-3.5">
                  <div className="text-xs">
                    <p className="font-medium text-slate-800">{member.province?.name ?? "—"}</p>
                    {member.city?.name && <p className="text-slate-500">{member.city.name}</p>}
                  </div>
                </Td>
                <Td className="max-w-[10rem] py-3.5">
                  <p className="truncate text-xs text-slate-600" title={member.structure?.name ?? undefined}>
                    {member.structure?.name ?? "—"}
                  </p>
                </Td>
                <Td className="py-3.5">
                  <MemberStatusBadge status={member.status} label={member.status_label} />
                </Td>
                <Td className="py-3.5 text-xs tabular-nums text-slate-500">
                  {formatShortDate(member.created_at)}
                </Td>
                <Td onClick={(e) => e.stopPropagation()} className="py-3.5 text-right">
                  <MemberRowActions
                    member={member}
                    busy={busyId === member.id}
                    onPreview={onPreview}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function MemberRowActions({
  member,
  busy,
  className,
  onPreview,
  onEdit,
  onDelete,
}: {
  member: Member;
  busy?: boolean;
  className?: string;
  onPreview: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-sm", className)}>
      <Tooltip content="Aperçu rapide">
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aperçu" onClick={() => onPreview(member)}>
          <Eye className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Voir le dossier">
        <Link href={`/membres/${member.id}`} aria-label="Voir le dossier">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </Tooltip>
      <Can permission={PERMISSIONS.membersUpdate}>
        <Tooltip content="Modifier">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Modifier" onClick={() => onEdit(member)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </Tooltip>
      </Can>
      <Can permission={PERMISSIONS.membersDelete}>
        <Tooltip content="Supprimer">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Supprimer"
            loading={busy}
            onClick={() => onDelete(member)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tooltip>
      </Can>
    </div>
  );
}

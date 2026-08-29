"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Avatar } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/table";
import type { Member } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

export function MemberPreviewDrawer({
  member,
  onClose,
  onEdit,
}: {
  member: Member | null;
  onClose: () => void;
  onEdit?: (member: Member) => void;
}) {
  return (
    <Drawer
      open={Boolean(member)}
      onClose={onClose}
      title={member?.full_name ?? "Membre"}
      description={member?.member_code}
      footer={
        member && (
          <>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(member)}>
                Modifier
              </Button>
            )}
            <Link href={`/membres/${member.id}`}>
              <Button>
                Voir le profil complet
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )
      }
    >
      {member && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar src={member.photo_url} name={member.full_name} size="lg" rounded="lg" />
            <div>
              <MemberStatusBadge status={member.status} label={member.status_label} />
              <p className="mt-1 text-sm text-slate-500">{member.structure?.name ?? "Sans structure"}</p>
            </div>
          </div>
          <DefinitionList
            columns={1}
            items={[
              { label: "Téléphone", value: member.phone ?? "—" },
              { label: "Province", value: member.province?.name },
              { label: "Ville", value: member.city?.name },
              { label: "Fonction", value: member.position },
              { label: "Inscription", value: formatShortDate(member.created_at) },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
}

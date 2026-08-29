"use client";

import Link from "next/link";
import { Ban, Eye, Printer, RefreshCw } from "lucide-react";
import { Can } from "@/components/auth/require-permission";
import { Avatar } from "@/components/ui/avatar";
import { CardStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import type { CardRow } from "@/components/cards/cards-status-nav";
import { cardStatusIcon } from "@/components/cards/cards-status-nav";
import { PERMISSIONS } from "@/lib/permissions";
import { cn, formatShortDate } from "@/lib/utils";

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 30;
}

export function CardsTable({
  cards,
  busyId,
  onRegenerate,
  onRevoke,
}: {
  cards: CardRow[];
  busyId?: number | null;
  onRegenerate: (card: CardRow) => void;
  onRevoke: (card: CardRow) => void;
}) {
  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {cards.map((card) => {
          const StatusIcon = cardStatusIcon(card.status);
          return (
            <article key={card.id} className="p-4 transition hover:bg-brand-50/30">
              <div className="flex items-start gap-3">
                <Avatar src={card.photo_url} name={card.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{card.full_name}</p>
                  <p className="font-mono text-[11px] text-brand-700">{card.card_number}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{card.member_code}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CardStatusBadge status={card.status} label={card.status_label} />
                    {card.is_valid && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        Valide
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Émise {formatShortDate(card.issued_at)} · Expire {formatShortDate(card.expires_at)}
                  </p>
                </div>
                <StatusIcon className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
              </div>
              <CardRowActions
                card={card}
                busy={busyId === card.id}
                className="mt-3 justify-end border-t border-slate-100 pt-3"
                onRegenerate={onRegenerate}
                onRevoke={onRevoke}
              />
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[56rem]">
          <thead>
            <tr className="bg-gradient-to-r from-brand-50/90 to-slate-50">
              <Th className="min-w-[14rem] rounded-tl-lg border-b-brand-100 bg-transparent">Membre</Th>
              <Th className="border-b-brand-100 bg-transparent">N° carte</Th>
              <Th className="border-b-brand-100 bg-transparent">Statut</Th>
              <Th className="border-b-brand-100 bg-transparent">Validité</Th>
              <Th className="border-b-brand-100 bg-transparent">Émise</Th>
              <Th className="border-b-brand-100 bg-transparent">Expiration</Th>
              <Th className="w-40 rounded-tr-lg border-b-brand-100 bg-transparent text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card, index) => {
              const StatusIcon = cardStatusIcon(card.status);
              const expiring = isExpiringSoon(card.expires_at);

              return (
                <Tr
                  key={card.id}
                  className={cn(
                    "group border-l-2 border-l-transparent hover:border-l-brand-500 hover:bg-brand-50/40",
                    index % 2 === 1 && "bg-slate-50/40",
                    !card.is_valid && "opacity-90",
                  )}
                >
                  <Td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar src={card.photo_url} name={card.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{card.full_name}</p>
                        <p className="font-mono text-[11px] text-slate-500">{card.member_code}</p>
                        {card.province?.name && (
                          <p className="truncate text-[11px] text-slate-400">{card.province.name}</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 font-mono text-[11px] font-medium text-brand-800 ring-1 ring-inset ring-brand-100">
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                      {card.card_number}
                    </span>
                  </Td>
                  <Td className="py-3.5">
                    <CardStatusBadge status={card.status} label={card.status_label} />
                  </Td>
                  <Td className="py-3.5">
                    {card.is_valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        ✓ Valide
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Non valide</span>
                    )}
                  </Td>
                  <Td className="py-3.5 text-xs tabular-nums text-slate-600">
                    {formatShortDate(card.issued_at)}
                  </Td>
                  <Td className="py-3.5">
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        expiring ? "font-medium text-amber-700" : "text-slate-600",
                      )}
                    >
                      {formatShortDate(card.expires_at)}
                      {expiring && " · bientôt"}
                    </span>
                  </Td>
                  <Td className="py-3.5 text-right">
                    <CardRowActions
                      card={card}
                      busy={busyId === card.id}
                      onRegenerate={onRegenerate}
                      onRevoke={onRevoke}
                    />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function CardRowActions({
  card,
  busy,
  className,
  onRegenerate,
  onRevoke,
}: {
  card: CardRow;
  busy?: boolean;
  className?: string;
  onRegenerate: (card: CardRow) => void;
  onRevoke: (card: CardRow) => void;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-sm", className)}>
      <Tooltip content="Aperçu & impression">
        <Link href={`/cartes/apercu/${card.member_id}`} aria-label="Aperçu">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-700 hover:bg-brand-50">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </Tooltip>
      <Tooltip content="Imprimer">
        <Link href={`/cartes/apercu/${card.member_id}`} aria-label="Imprimer">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-50">
            <Printer className="h-4 w-4" />
          </Button>
        </Link>
      </Tooltip>
      <Can permission={PERMISSIONS.cardsIssue}>
        <Tooltip content="Régénérer">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-700 hover:bg-amber-50"
            aria-label="Régénérer"
            loading={busy}
            onClick={() => onRegenerate(card)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </Tooltip>
      </Can>
      <Can permission={PERMISSIONS.cardsRevoke}>
        {card.status === "active" && (
          <Tooltip content="Désactiver">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-50"
              aria-label="Désactiver"
              onClick={() => onRevoke(card)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </Can>
    </div>
  );
}

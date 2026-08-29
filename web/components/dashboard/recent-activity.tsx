"use client";

import {
  CreditCard,
  ScanLine,
  UserCheck,
  UserPlus,
  UserMinus,
  Users,
  ShieldAlert,
  CalendarDays,
  CheckCircle2,
  IdCard,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatRelative } from "@/lib/utils";

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  member: { icon: UserPlus, tone: "bg-brand-50 text-brand-700 ring-brand-100" },
  validation: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  card: { icon: IdCard, tone: "bg-amber-50 text-amber-800 ring-amber-100" },
  verification: { icon: ScanLine, tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  activity: { icon: CalendarDays, tone: "bg-brand-50 text-brand-800 ring-brand-100" },
};

export function RecentActivity({
  items,
}: {
  items: Array<{
    type: string;
    label: string;
    reference: string | null;
    status: string | null;
    at: string | null;
  }>;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, index) => {
        const visual = ICONS[item.type] ?? ICONS.member;
        const Icon = visual.icon;
        return (
          <li key={`${item.type}-${index}`} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${visual.tone}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.reference}
                {item.status ? ` · ${item.status}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-slate-400">{formatRelative(item.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export { CreditCard, UserCheck, UserPlus, UserMinus, Users, ShieldAlert, MapPin };

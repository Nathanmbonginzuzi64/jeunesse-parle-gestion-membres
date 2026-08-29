import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_STATUS_STYLES,
  ATTENDANCE_STATUS_STYLES,
  CARD_STATUS_STYLES,
  MEMBER_STATUS_STYLES,
} from "@/lib/permissions";
import { Ban, CheckCircle2, Clock3, MinusCircle, PauseCircle } from "lucide-react";

const MEMBER_ICONS: Record<string, typeof CheckCircle2> = {
  active: CheckCircle2,
  pending: Clock3,
  inactive: MinusCircle,
  suspended: Ban,
  archived: PauseCircle,
};

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  styles,
  status,
  label,
}: {
  styles: Record<string, string>;
  status?: string | null;
  label?: string | null;
}) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        styles[status] ?? "bg-slate-100 text-slate-600 ring-slate-200",
      )}
    >
      {label ?? status}
    </span>
  );
}

export const MemberStatusBadge = ({
  status,
  label,
}: {
  status?: string | null;
  label?: string | null;
}) => {
  const Icon = status ? MEMBER_ICONS[status] : undefined;
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        MEMBER_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-200",
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {label ?? status}
    </span>
  );
};

export const CardStatusBadge = (props: { status?: string | null; label?: string | null }) => (
  <StatusBadge styles={CARD_STATUS_STYLES} {...props} />
);

export const ActivityStatusBadge = (props: { status?: string | null; label?: string | null }) => (
  <StatusBadge styles={ACTIVITY_STATUS_STYLES} {...props} />
);

export const AttendanceStatusBadge = (props: { status?: string | null; label?: string | null }) => (
  <StatusBadge styles={ATTENDANCE_STATUS_STYLES} {...props} />
);

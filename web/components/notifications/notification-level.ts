import { AlertTriangle, CheckCheck, Info, ShieldAlert, type LucideIcon } from "lucide-react";

export const NOTIFICATION_LEVEL_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: string; chip: string }
> = {
  success: {
    label: "Succès",
    icon: CheckCheck,
    tone: "border-emerald-200 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-800",
  },
  info: {
    label: "Information",
    icon: Info,
    tone: "border-brand-200 bg-brand-50",
    chip: "bg-brand-100 text-brand-800",
  },
  warning: {
    label: "Avertissement",
    icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-800",
  },
  danger: {
    label: "Urgent",
    icon: ShieldAlert,
    tone: "border-red-200 bg-red-50",
    chip: "bg-red-100 text-red-800",
  },
};

export function notificationLevelMeta(level: string) {
  return NOTIFICATION_LEVEL_META[level] ?? NOTIFICATION_LEVEL_META.info;
}

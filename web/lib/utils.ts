import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("fr-CD", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-CD", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-CD", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : shortDateFormatter.format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/** Rend une durée relative lisible ("il y a 3 jours"). */
export function formatRelative(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }

  return "à l'instant";
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

/**
 * Compteurs style Facebook : 999 → 999, 1000 → 1 K, 1500 → 1,5 K, 1_000_000 → 1 M.
 */
export function formatCompactCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  const n = Math.max(0, Math.floor(Number(value)));
  if (n < 1000) return String(n);

  const formatScaled = (divisor: number, suffix: string) => {
    const scaled = n / divisor;
    const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${text} ${suffix}`;
  };

  if (n < 1_000_000) return formatScaled(1_000, "K");
  if (n < 1_000_000_000) return formatScaled(1_000_000, "M");
  return formatScaled(1_000_000_000, "Md");
}

export function initials(fullName?: string | null): string {
  if (!fullName) return "?";
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Retarde l'exécution : utilisé par la recherche instantanée. */
export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 350) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

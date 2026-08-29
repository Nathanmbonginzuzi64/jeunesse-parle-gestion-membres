const TIMEZONE_RDC = "Africa/Kinshasa";

/** Salutation selon l'heure exacte (fuseau Africa/Kinshasa). */
export function getTimeGreeting(date = new Date(), timeZone = TIMEZONE_RDC): string {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date).find((part) => part.type === "hour")?.value;

  let hour = Number(hourPart);
  if (!Number.isFinite(hour)) hour = date.getHours();
  // Certains moteurs renvoient 24 à minuit.
  if (hour === 24) hour = 0;

  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  if (hour >= 18 && hour < 22) return "Bonsoir";
  return "Bonne nuit";
}

export function formatDateLong(date = new Date(), timeZone = TIMEZONE_RDC): string {
  const raw = new Intl.DateTimeFormat("fr-CD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatTime(date = new Date(), timeZone = TIMEZONE_RDC): string {
  return new Intl.DateTimeFormat("fr-CD", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function formatMonthYear(date = new Date(), timeZone = TIMEZONE_RDC): string {
  const raw = new Intl.DateTimeFormat("fr-CD", {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getWeekNumber(date = new Date(), timeZone = TIMEZONE_RDC): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const utc = new Date(Date.UTC(year, month - 1, day));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function getCalendarDays(date = new Date(), timeZone = TIMEZONE_RDC) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Array<{ day: number | null; isToday: boolean }> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ day: null, isToday: false });
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ day: d, isToday: d === day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isToday: false });
  }

  return { year, month, day, cells };
}

export { TIMEZONE_RDC };

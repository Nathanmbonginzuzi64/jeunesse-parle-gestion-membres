/** Extrait un jeton / code membre depuis un QR brut (URL ou texte). */
export function extractTokenFromQr(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const match =
    trimmed.match(/\/verifier-membre\/([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/\/verify\/([A-Za-z0-9_-]+)/i);
  if (match?.[1]) return match[1];

  if (/^JP-RDC-/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[A-Za-z0-9_-]{16,80}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && (/^JP-RDC-/i.test(last) || /^[A-Za-z0-9_-]{16,80}$/.test(last))) {
      return /^JP-RDC-/i.test(last) ? last.toUpperCase() : last;
    }
  } catch {
    /* ignore */
  }

  return trimmed;
}

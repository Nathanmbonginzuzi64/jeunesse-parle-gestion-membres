import { api, type ApiError } from "@/lib/api";
import type { Paginated } from "@/lib/types";

type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * Récupère toutes les pages d'un rapport paginé (max 100 lignes / requête côté API).
 */
export async function fetchAllReportPages<TItem, TExtra extends Record<string, unknown> = Record<string, never>>(
  path: string,
  query: Query,
  perPage = 100,
): Promise<{ data: TItem[]; meta: Paginated<TItem>["meta"] } & TExtra> {
  type PageResponse = { data: TItem[]; meta: Paginated<TItem>["meta"] } & TExtra;

  const first = await api.get<PageResponse>(path, { ...query, page: 1, per_page: perPage });
  const all = [...first.data];

  for (let page = 2; page <= first.meta.last_page; page++) {
    const next = await api.get<{ data: TItem[] }>(path, { ...query, page, per_page: perPage });
    all.push(...next.data);
  }

  const { data: _rows, meta, ...extra } = first;

  return {
    ...(extra as TExtra),
    data: all,
    meta: {
      ...meta,
      current_page: 1,
      last_page: 1,
      per_page: all.length,
      total: meta.total,
    },
  };
}

export function reportApiErrorMessage(caught: unknown): string {
  if (caught && typeof caught === "object" && "status" in caught && "message" in caught) {
    const err = caught as ApiError;
    if (err.status === 422 && err.errors && Object.keys(err.errors).length > 0) {
      const first = Object.values(err.errors)[0]?.[0];
      if (first) return first;
    }
    return err.message;
  }
  if (caught instanceof Error) return caught.message;
  return "Export PDF impossible.";
}

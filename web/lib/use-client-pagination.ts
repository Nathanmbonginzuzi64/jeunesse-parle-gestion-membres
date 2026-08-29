"use client";

import { useEffect, useMemo, useState } from "react";

/** Pagination côté client pour les listes affichées dans une carte. */
export function useClientPagination<T>(items: T[], perPage = 5, resetKey?: string | number) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, total, perPage]);

  const safePage = Math.min(Math.max(1, page), lastPage);

  const slice = useMemo(
    () => items.slice((safePage - 1) * perPage, safePage * perPage),
    [items, safePage, perPage],
  );

  return { page: safePage, setPage, lastPage, slice, total, perPage };
}

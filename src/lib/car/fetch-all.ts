import type { CrudFilters, CrudSorting, MetaQuery } from "@refinedev/core";

import { dataProvider } from "@nocobase/portal-sdk/data";

type FetchAllParams = {
  resource: string;
  filters?: CrudFilters;
  sorters?: CrudSorting;
  meta?: MetaQuery;
  pageSize?: number;
};

export type FetchAllResult<T> = {
  rows: T[];
  total: number;
  complete: boolean;
};

/**
 * Read a complete filtered collection without relying on a silent one-page cap.
 * Callers can refuse to present/export the result when `complete` is false.
 */
export async function fetchAllRecords<T extends Record<string, unknown>>({
  resource,
  filters,
  sorters,
  meta,
  pageSize = 500,
}: FetchAllParams): Promise<FetchAllResult<T>> {
  const rows: T[] = [];
  let total = 0;
  let currentPage = 1;

  while (currentPage === 1 || rows.length < total) {
    const result = await dataProvider.getList<T>({
      resource,
      filters,
      sorters,
      pagination: { currentPage, pageSize, mode: "server" },
      meta,
    });
    const pageRows = (result.data ?? []) as T[];
    total = Number(result.total ?? pageRows.length);
    rows.push(...pageRows);

    if (pageRows.length === 0) break;
    currentPage += 1;
  }

  return {
    rows,
    total,
    complete: rows.length >= total,
  };
}

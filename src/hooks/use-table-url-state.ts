"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";

export const TABLE_VIEWS = ["table", "list"] as const;

export type TableView = (typeof TABLE_VIEWS)[number];

/**
 * The table state a page has to send to its endpoint.
 *
 * TableCN owns these values through nuqs. The page reads the resulting URL back
 * through Next rather than mounting its own `useQueryStates` — one nuqs owner
 * per key, or the second instance sits on a stale snapshot and the query never
 * sees the change.
 */
export function useTableUrlState() {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const page = Number(searchParams.get("page"));
    const perPage = Number(searchParams.get("perPage"));

    return {
      page: Number.isInteger(page) && page > 0 ? page : 1,
      perPage: Number.isInteger(perPage) && perPage > 0 ? perPage : 10,
      search: searchParams.get("search") ?? "",
      sort: searchParams.get("sort") ?? "",
      filters: searchParams.get("filters") ?? "",
      joinOperator: searchParams.get("joinOperator") ?? "and",
    };
  }, [searchParams]);
}

/**
 * Which rendering of the rows is on screen. It rides in the URL like the rest
 * of the table state, so a shared link opens the way the sender left it, and it
 * changes nothing about the query.
 */
export function useTableView() {
  return useQueryState(
    "view",
    parseAsStringLiteral(TABLE_VIEWS).withDefault("table")
  );
}

/**
 * The query-shaped half of the URL state, ready to spread into a fetch. Absent
 * values are left out entirely rather than sent empty, and `joinOperator` only
 * travels with the filters it applies to.
 */
export function toQueryParams(state: ReturnType<typeof useTableUrlState>) {
  return {
    page: state.page,
    pageSize: state.perPage,
    ...(state.search && { search: state.search }),
    ...(state.sort && { sort: state.sort }),
    ...(state.filters && {
      filters: state.filters,
      joinOperator: state.joinOperator,
    }),
  };
}

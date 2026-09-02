"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { Pagination } from "@/lib/types/pagination";

export function flattenInfinitePages<T>(
  pages: Pagination<T>[] | undefined
): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

export function getInfiniteTableNextPageParam<T>(lastPage: Pagination<T>) {
  return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
}

interface UseInfiniteTableQueryOptions<T> {
  queryKey: unknown[];
  queryFn: (page: number) => Promise<Pagination<T>>;
  enabled?: boolean;
}

export function useInfiniteTableQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: UseInfiniteTableQueryOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: getInfiniteTableNextPageParam,
    enabled,
    placeholderData: (previousData) => previousData,
  });

  const rows = flattenInfinitePages(query.data?.pages);
  const totalItems = query.data?.pages[0]?.totalItems ?? 0;
  const groupSummaries = query.data?.pages[0]?.groups ?? null;

  return {
    ...query,
    rows,
    totalItems,
    groupSummaries,
    loadedCount: rows.length,
  };
}

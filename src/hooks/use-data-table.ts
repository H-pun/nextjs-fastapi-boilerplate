import * as React from "react";

import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { snakeCase } from "lodash";

import { useDebounce } from "@/hooks/use-debounce";
import type { Pagination, PaginationQuery } from "@/lib/types/pagination";

interface UseDataTableProps<TData, TQuery extends PaginationQuery> {
  key: string;
  fetch: (params: TQuery) => Promise<Pagination<TData> | undefined>;
  columns: ColumnDef<TData>[];
  hiddenColumns?: (keyof TData)[];
  expand?: boolean;
}

export function useDataTable<TData, TQuery extends PaginationQuery>({
  key,
  fetch,
  columns,
  hiddenColumns,
  expand = false,
}: UseDataTableProps<TData, TQuery>) {
  type Params = Partial<Omit<TQuery, keyof PaginationQuery>>;
  const [appliedParams, setAppliedParams] = React.useState<Params>({});
  const [draftParams, setDraftParams] = React.useState<Params>({});

  const [filter, setFilter] = React.useState<string>("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(
      Object.fromEntries(hiddenColumns?.map((key) => [key, false]) ?? [])
    );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const currentSorting = sorting[0]; // Assume only one sorting column is active (first index)
  const debouncedFilter = useDebounce(filter, 500);

  React.useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [filter, appliedParams, pagination.pageSize, currentSorting]); // reset page index when filter or appliedParams change

  const applyQuery = React.useCallback(() => {
    setAppliedParams(draftParams);
  }, [draftParams]);

  const resetQuery = React.useCallback(() => {
    setDraftParams({});
  }, []);

  const setQueryValue = React.useCallback(
    <K extends keyof Params>(key: K, value: Params[K]) => {
      setDraftParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const activeQueryCount = React.useMemo(
    () =>
      Object.entries(appliedParams).filter(([, v]) => v != undefined).length,
    [appliedParams]
  );

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: [key, pagination, appliedParams, debouncedFilter, currentSorting],
    queryFn: () =>
      fetch({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedFilter,
        ...appliedParams,
        ...(currentSorting && {
          orderBy: snakeCase(currentSorting.id),
          orderDirection: currentSorting.desc ? "desc" : "asc",
        }),
      } as TQuery),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: data?.items ?? [],
    rowCount: data?.totalItems ?? 0,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    ...(expand && {
      getRowCanExpand: () => true,
      getExpandedRowModel: getExpandedRowModel(),
    }),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
  });
  return {
    data,
    table,
    pagination,
    filter,
    setFilter,
    debouncedFilter,
    isFetching,
    refetch,
    dataUpdatedAt,
    queryParams: draftParams,
    activeQueryCount,
    resetQuery,
    applyQuery,
    setQueryValue,
  };
}

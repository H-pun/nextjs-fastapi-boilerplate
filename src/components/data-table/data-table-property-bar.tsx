"use client";

import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { DataTableAddFilter } from "@/components/data-table/data-table-add-filter";
import { DataTableColumnFilterChips } from "@/components/data-table/data-table-column-filter-chip";
import { DataTableSortChips } from "@/components/data-table/data-table-sort-chip";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";
import { cn } from "@/lib/utils";

interface DataTablePropertyBarProps<TData> {
  table: Table<TData>;
  disabled?: boolean;
  shallow?: boolean;
  debounceMs?: number;
  throttleMs?: number;
  className?: string;
  /** Active filter chips rendered before "+ Filter". */
  children?: React.ReactNode;
  /** Page-specific entries in the "+ Filter" picker. */
  filterMenuExtras?: React.ReactNode;
}

export function DataTablePropertyBar<TData>({
  table,
  disabled,
  shallow,
  debounceMs,
  throttleMs,
  className,
  children,
  filterMenuExtras,
}: DataTablePropertyBarProps<TData>) {
  const [openFilterId, setOpenFilterId] = React.useState<string | null>(null);

  const {
    columns,
    filters,
    addColumnFilter,
    onFilterUpdate,
    onFilterRemove,
  } = useDataTableFilters(table, { shallow, debounceMs, throttleMs });

  const handleFilterAdd = React.useCallback(
    (column: Parameters<typeof addColumnFilter>[0]) => {
      const next = addColumnFilter(column);
      setOpenFilterId(next.filterId);
    },
    [addColumnFilter]
  );

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 overflow-x-auto pb-1",
        className
      )}
    >
      <DataTableSortChips table={table} disabled={disabled} />
      {children}
      {filters.length > 0 ? (
        <DataTableColumnFilterChips
          columns={columns}
          filters={filters}
          onFilterUpdate={onFilterUpdate}
          onFilterRemove={onFilterRemove}
          disabled={disabled}
          openFilterId={openFilterId}
        />
      ) : null}
      <DataTableAddFilter
        table={table}
        disabled={disabled}
        shallow={shallow}
        debounceMs={debounceMs}
        throttleMs={throttleMs}
        menuExtras={filterMenuExtras}
        columns={columns}
        filters={filters}
        onFilterAdd={handleFilterAdd}
      />
    </div>
  );
}

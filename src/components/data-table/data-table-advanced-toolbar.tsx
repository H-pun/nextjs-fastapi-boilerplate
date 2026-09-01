"use client";

import type { Table } from "@tanstack/react-table";
import type * as React from "react";

import { DataTableQueryKeysProvider } from "@/components/data-table/data-table-query-keys";
import { DataTableResetFilters } from "@/components/data-table/data-table-reset-filters";
import { DataTableSettingsMenu } from "@/components/data-table/data-table-settings-menu";
import { cn } from "@/lib/utils";

interface DataTableAdvancedToolbarProps<
  TData,
> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  /** Refetches the page's own query, surfaced as "Refresh data" under Settings. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Off in the list view, which has no columns to hide or reorder. */
  columnControls?: boolean;
}

export function DataTableAdvancedToolbar<TData>({
  table,
  onRefresh,
  isRefreshing,
  columnControls,
  children,
  className,
  ...props
}: DataTableAdvancedToolbarProps<TData>) {
  return (
    // The search box and Reset write the table's params but never see the
    // table, so its names reach them from here.
    <DataTableQueryKeysProvider keys={table.options.meta?.queryKeys}>
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className={cn(
          "flex w-full items-start justify-between gap-2 p-1",
          className
        )}
        {...props}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {children}
          <DataTableResetFilters />
        </div>
        <div className="flex items-center gap-2">
          <DataTableSettingsMenu
            table={table}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            columnControls={columnControls}
          />
        </div>
      </div>
    </DataTableQueryKeysProvider>
  );
}

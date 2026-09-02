"use client";

import type { Column, Table } from "@tanstack/react-table";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";

import {
  DataTableColumnFilterEditor,
  formatFilterSummary,
  isFilterActive,
} from "@/components/data-table/data-table-filter-controls";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ExtendedColumnFilter } from "@/types/data-table";

interface DataTableColumnFilterChipProps<TData> {
  column: Column<TData>;
  filter: ExtendedColumnFilter<TData>;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, "filterId">>
  ) => void;
  onRemove: () => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}

export function DataTableColumnFilterChip<TData>({
  column,
  filter,
  onFilterUpdate,
  onRemove,
  disabled,
  defaultOpen = false,
}: DataTableColumnFilterChipProps<TData>) {
  const [open, setOpen] = React.useState(defaultOpen);
  const label = column.columnDef.meta?.label ?? column.id;
  const Icon = column.columnDef.meta?.icon;
  const active = isFilterActive(filter);
  const summary = formatFilterSummary(filter);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "inline-flex h-7 items-center gap-0.5 rounded-md border border-transparent",
          active
            ? "border-border bg-background text-foreground"
            : "bg-muted/40 text-muted-foreground"
        )}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1 rounded-md px-2 font-normal hover:bg-transparent hover:text-inherit"
          >
            {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
            <span className="max-w-32 truncate">
              {active && summary ? `${label}: ${summary}` : label}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={`Remove ${label} filter`}
          className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-md"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <DataTableColumnFilterEditor
          filter={filter}
          column={column}
          onFilterUpdate={onFilterUpdate}
          onClear={() => {
            onRemove();
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DataTableColumnFilterChipsProps<TData> {
  columns: Column<TData>[];
  filters: ExtendedColumnFilter<TData>[];
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, "filterId">>
  ) => void;
  onFilterRemove: (filterId: string) => void;
  disabled?: boolean;
  /** filterId to open editor on first render (e.g. just added from picker). */
  openFilterId?: string | null;
}

export function DataTableColumnFilterChips<TData>({
  columns,
  filters,
  onFilterUpdate,
  onFilterRemove,
  disabled,
  openFilterId,
}: DataTableColumnFilterChipsProps<TData>) {
  return (
    <>
      {filters.map((filter) => {
        const column = columns.find((col) => col.id === filter.id);
        if (!column) return null;

        return (
          <DataTableColumnFilterChip
            key={filter.filterId}
            column={column}
            filter={filter}
            onFilterUpdate={onFilterUpdate}
            onRemove={() => onFilterRemove(filter.filterId)}
            disabled={disabled}
            defaultOpen={openFilterId === filter.filterId}
          />
        );
      })}
    </>
  );
}

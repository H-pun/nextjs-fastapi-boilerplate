"use client";

import type { Column, Table } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import * as React from "react";

import { DataTableFilterItem } from "@/components/data-table/data-table-filter-controls";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sortable,
  SortableContent,
  SortableOverlay,
} from "@/components/ui/sortable";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";
import { cn } from "@/lib/utils";

interface DataTableAdvancedFilterPanelProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  debounceMs?: number;
  throttleMs?: number;
  shallow?: boolean;
}

export function DataTableAdvancedFilterPanel<TData>({
  table,
  debounceMs,
  throttleMs,
  shallow,
  className,
  ...props
}: DataTableAdvancedFilterPanelProps<TData>) {
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  const {
    columns,
    filters,
    joinOperator,
    onFilterAdd,
    onFilterUpdate,
    onFilterRemove,
    onFiltersReset,
    onJoinOperatorChange,
    setFiltersAndResetPage,
  } = useDataTableFilters(table, { debounceMs, throttleMs, shallow });

  return (
    <div
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className={cn("flex flex-col gap-3.5", className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h4 id={labelId} className="leading-none font-medium">
          {filters.length > 0 ? "Filters" : "No filters applied"}
        </h4>
        <p
          id={descriptionId}
          className={cn(
            "text-muted-foreground text-sm",
            filters.length > 0 && "sr-only"
          )}
        >
          {filters.length > 0
            ? "Modify filters to refine your rows."
            : "Add filters to refine your rows."}
        </p>
      </div>
      <Sortable
        value={filters}
        onValueChange={setFiltersAndResetPage}
        getItemValue={(item) => item.filterId}
      >
        {filters.length > 0 ? (
          <SortableContent asChild>
            <div
              role="list"
              className="flex max-h-[300px] flex-col gap-2 overflow-x-auto overflow-y-auto p-1"
            >
              {filters.map((filter, index) => (
                <DataTableFilterItem<TData>
                  key={filter.filterId}
                  filter={filter}
                  index={index}
                  filterItemId={`${id}-filter-${filter.filterId}`}
                  joinOperator={joinOperator}
                  setJoinOperator={onJoinOperatorChange}
                  columns={columns}
                  onFilterUpdate={onFilterUpdate}
                  onFilterRemove={onFilterRemove}
                />
              ))}
            </div>
          </SortableContent>
        ) : null}
        <div className="flex w-full items-center gap-2">
          <Button
            className="rounded"
            ref={addButtonRef}
            onClick={() => onFilterAdd()}
          >
            Add filter
          </Button>
          {filters.length > 0 ? (
            <Button variant="outline" className="rounded" onClick={onFiltersReset}>
              Reset filters
            </Button>
          ) : null}
        </div>
        <SortableOverlay>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 h-8 min-w-[72px] rounded-sm" />
            <div className="bg-primary/10 h-8 w-32 rounded-sm" />
            <div className="bg-primary/10 h-8 w-32 rounded-sm" />
            <div className="bg-primary/10 h-8 min-w-36 flex-1 rounded-sm" />
            <div className="bg-primary/10 size-8 shrink-0 rounded-sm" />
            <div className="bg-primary/10 size-8 shrink-0 rounded-sm" />
          </div>
        </SortableOverlay>
      </Sortable>
    </div>
  );
}

interface DataTableAddFilterProps<TData> {
  table: Table<TData>;
  disabled?: boolean;
  shallow?: boolean;
  debounceMs?: number;
  throttleMs?: number;
  /** Page-specific entries in the "Filter by..." picker. */
  menuExtras?: React.ReactNode;
  columns?: Column<TData>[];
  filters?: ReturnType<typeof useDataTableFilters<TData>>["filters"];
  onFilterAdd?: (column: Column<TData>) => void;
}

export function DataTableAddFilter<TData>({
  table,
  disabled,
  shallow,
  debounceMs,
  throttleMs,
  menuExtras,
  columns: columnsProp,
  filters: filtersProp,
  onFilterAdd: onFilterAddProp,
}: DataTableAddFilterProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const hook = useDataTableFilters(table, { debounceMs, throttleMs, shallow });

  const columns = columnsProp ?? hook.columns;
  const filters = filtersProp ?? hook.filters;
  const onFilterAdd = onFilterAddProp ?? hook.addColumnFilter;

  const availableColumns = React.useMemo(
    () =>
      columns.filter(
        (column) => !filters.some((filter) => filter.id === column.id)
      ),
    [columns, filters]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setShowAdvanced(false);
  };

  const handleColumnSelect = (column: Column<TData>) => {
    onFilterAdd(column);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-muted-foreground h-7 px-2 font-normal hover:text-foreground"
        >
          <Plus />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "p-0",
          showAdvanced ? "w-[min(100vw-2rem,520px)]" : "w-52"
        )}
      >
        {showAdvanced ? (
          <div className="p-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 h-7 font-normal"
              onClick={() => setShowAdvanced(false)}
            >
              Back
            </Button>
            <DataTableAdvancedFilterPanel
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
            />
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Filter by..." />
            <CommandList>
              <CommandEmpty>No properties found.</CommandEmpty>
              <CommandGroup>
                {availableColumns.map((column) => {
                  const Icon = column.columnDef.meta?.icon;
                  const label = column.columnDef.meta?.label ?? column.id;

                  return (
                    <CommandItem
                      key={column.id}
                      value={label}
                      onSelect={() => handleColumnSelect(column)}
                    >
                      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                      {label}
                    </CommandItem>
                  );
                })}
                {menuExtras}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="Add advanced filter"
                  onSelect={() => setShowAdvanced(true)}
                  className="text-muted-foreground"
                >
                  <Plus className="size-3.5" />
                  Add advanced filter
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

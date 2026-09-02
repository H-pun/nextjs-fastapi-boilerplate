"use client";

import type { ColumnSort, Table } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDataTableSorting } from "@/hooks/use-data-table-sorting";
import { cn } from "@/lib/utils";

interface DataTableSortChipsProps<TData> {
  table: Table<TData>;
  disabled?: boolean;
}

function SortChip({
  label,
  desc,
  onToggleDirection,
  onRemove,
  disabled,
}: {
  label: string;
  desc: boolean;
  onToggleDirection: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-primary/10 text-primary inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1"
        onClick={onToggleDirection}
      >
        {desc ? (
          <ArrowDown className="size-3.5" />
        ) : (
          <ArrowUp className="size-3.5" />
        )}
        <span>{label}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Remove sort by ${label}`}
        className="hover:bg-primary/10 rounded p-0.5"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function DataTableSortChips<TData>({
  table,
  disabled,
}: DataTableSortChipsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const {
    sorting,
    columnLabels,
    availableColumns,
    onSortAdd,
    onSortUpdate,
    onSortRemove,
  } = useDataTableSorting(table);

  if (sorting.length === 0) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || availableColumns.length === 0}
            className="text-muted-foreground h-7 px-2 font-normal hover:text-foreground"
          >
            <ChevronsUpDown className="size-3.5" />
            Sort
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-0">
          <Command>
            <CommandInput placeholder="Sort by..." />
            <CommandList>
              <CommandEmpty>No sortable columns.</CommandEmpty>
              <CommandGroup>
                {availableColumns.map((column) => (
                  <CommandItem
                    key={column.id}
                    value={column.label}
                    onSelect={() => {
                      onSortAdd(column.id);
                      setOpen(false);
                    }}
                  >
                    {column.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {sorting.map((sort: ColumnSort) => (
        <SortChip
          key={sort.id}
          label={columnLabels.get(sort.id) ?? sort.id}
          desc={sort.desc}
          disabled={disabled}
          onToggleDirection={() => onSortUpdate(sort.id, { desc: !sort.desc })}
          onRemove={() => onSortRemove(sort.id)}
        />
      ))}
      {availableColumns.length > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label="Add sort"
              className="text-muted-foreground"
            >
              <Plus />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-0">
            <Command>
              <CommandInput placeholder="Sort by..." />
              <CommandList>
                <CommandEmpty>No sortable columns.</CommandEmpty>
                <CommandGroup>
                  {availableColumns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={column.label}
                      onSelect={() => {
                        onSortAdd(column.id);
                        setOpen(false);
                      }}
                    >
                      {column.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </>
  );
}

"use client";

import type { Table } from "@tanstack/react-table";
import { ListFilter } from "lucide-react";
import * as React from "react";

import { DataTableAdvancedFilterPanel } from "@/components/data-table/data-table-add-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";

const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const FILTER_SHORTCUT_KEY = "f";
const REMOVE_FILTER_SHORTCUTS = ["backspace", "delete"];

interface DataTableFilterListProps<TData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: Table<TData>;
  debounceMs?: number;
  throttleMs?: number;
  shallow?: boolean;
  disabled?: boolean;
}

/** @deprecated Use DataTablePropertyBar / DataTableAddFilter instead. */
export function DataTableFilterList<TData>({
  table,
  debounceMs = DEBOUNCE_MS,
  throttleMs = THROTTLE_MS,
  shallow = true,
  disabled,
  ...props
}: DataTableFilterListProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const { filters, onFilterRemove } = useDataTableFilters(table, {
    debounceMs,
    throttleMs,
    shallow,
  });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement &&
          event.target.contentEditable === "true")
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === FILTER_SHORTCUT_KEY &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
        filters.length > 0
      ) {
        event.preventDefault();
        onFilterRemove(filters[filters.length - 1]?.filterId ?? "");
      }
    },
    [filters, onFilterRemove]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="font-normal"
          aria-label="Filter"
          onKeyDown={onTriggerKeyDown}
          disabled={disabled}
        >
          <ListFilter className="text-muted-foreground" />
          Filter
          {filters.length > 0 ? (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {filters.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-full p-4 sm:min-w-[380px]" {...props}>
        <DataTableAdvancedFilterPanel
          table={table}
          shallow={shallow}
          debounceMs={debounceMs}
          throttleMs={throttleMs}
        />
      </PopoverContent>
    </Popover>
  );
}

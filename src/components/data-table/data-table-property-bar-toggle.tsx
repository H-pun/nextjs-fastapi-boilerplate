"use client";

import type { Table } from "@tanstack/react-table";
import { ListFilter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { DEFAULT_QUERY_KEYS } from "@/components/data-table/data-table-query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";
import { cn } from "@/lib/utils";

interface DataTablePropertyBarToggleProps<TData> {
  table: Table<TData>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  shallow?: boolean;
}

export function DataTablePropertyBarToggle<TData>({
  table,
  open,
  onOpenChange,
  disabled,
  shallow,
}: DataTablePropertyBarToggleProps<TData>) {
  const { filters } = useDataTableFilters(table, { shallow });
  const sorting = table.getState().sorting;
  const activeCount = filters.length + sorting.length;
  const hasActiveRules = activeCount > 0;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      aria-expanded={open}
      aria-pressed={open}
      aria-label="Toggle filter and sort"
      className={cn(
        "font-normal",
        (open || hasActiveRules) && "border-border bg-muted/50"
      )}
      onClick={() => onOpenChange(!open)}
    >
      <ListFilter className="text-muted-foreground" />
      Filter
      {hasActiveRules ? (
        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  );
}

export function usePropertyBarOpenState<TData>(
  table: Table<TData>,
  /** Extra URL keys that should open the bar on load (e.g. page-specific filters). */
  openWhenKeys: string[] = []
) {
  const searchParams = useSearchParams();
  const keys = table.options.meta?.queryKeys ?? DEFAULT_QUERY_KEYS;

  const ruleSignature = React.useMemo(
    () =>
      [
        searchParams.get(keys.sort),
        searchParams.get(keys.filters),
        ...openWhenKeys.map((key) => searchParams.get(key)),
      ].join("\0"),
    [keys.filters, keys.sort, openWhenKeys, searchParams]
  );

  const hasActiveRules = ruleSignature.replace(/\0/g, "").length > 0;

  const [manualOpen, setManualOpen] = React.useState(false);
  const [dismissedFor, setDismissedFor] = React.useState<string | null>(null);

  const open = hasActiveRules
    ? dismissedFor !== ruleSignature
    : manualOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (hasActiveRules) {
        setDismissedFor(next ? null : ruleSignature);
        return;
      }
      setManualOpen(next);
    },
    [hasActiveRules, ruleSignature]
  );

  return [open, setOpen] as const;
}

"use client";

import { LayoutList, Table2 } from "lucide-react";

import type { TableView } from "@/hooks/use-table-url-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Table or list — the same rows, rendered two ways. */
export function DataTableViewToggle({
  value,
  onChange,
}: {
  value: TableView;
  onChange: (view: TableView) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(next) => next && onChange(next as TableView)}
      aria-label="View"
    >
      <ToggleGroupItem value="table">
        <Table2 />
        Table
      </ToggleGroupItem>
      <ToggleGroupItem value="list">
        <LayoutList />
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

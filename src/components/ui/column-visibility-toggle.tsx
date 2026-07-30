import { Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnVisibilityToggleProps<TData> {
  table: Table<TData>;
}

export function ColumnVisibilityToggle<TData>({
  table,
}: ColumnVisibilityToggleProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={"sm"} className="ml-auto">
          <Settings2 /> View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ScrollArea>
          <div className="max-h-72">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import React from "react";
import { Table as RawTable, flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ChevronDown, ChevronsUpDown, ChevronUp, Loader2 } from "lucide-react";

interface DataTableProps<TData> {
  table: RawTable<TData>;
  loading?: boolean;
  pagination?: boolean;
  renderSubRow?: (row: TData, index: number) => React.ReactNode;
}

export function DataTable<TData>({
  table,
  loading = false,
  pagination = true,
  renderSubRow,
}: DataTableProps<TData>) {
  "use no memo";
  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const renderText = flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  );

                  return (
                    <TableHead
                      key={header.id}
                      className={
                        header.column.id === "expander" ? "w-0 p-0" : "px-2"
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="link"
                          className="text-foreground gap-1 p-0!"
                          onClick={() =>
                            header.column.toggleSorting(sorted === "asc")
                          }
                        >
                          {renderText}
                          {sorted === "asc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : sorted === "desc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      ) : (
                        renderText
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-24"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleFlatColumns().length}
                        className="w-0 p-0"
                      >
                        {renderSubRow?.(row.original, row.index)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && table.getPageCount() > 1 && (
        <DataTablePagination table={table} />
      )}
    </>
  );
}

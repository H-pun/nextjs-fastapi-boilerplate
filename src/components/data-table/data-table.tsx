"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS, type Transform } from "@dnd-kit/utilities";
import {
  type Cell,
  flexRender,
  type Header,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  /**
   * Makes each row open its record. Interactive cells (action menus, buttons)
   * have to stop propagation themselves, or they fire this too.
   */
  onRowClick?: (row: TData) => void;
}

/**
 * A pinned cell floats above the columns scrolling under it, so it can never be
 * even slightly transparent. The row's own hover and open-menu tints are
 * `bg-muted/50`, which would do exactly that, so they are pre-mixed against the
 * page background here — same resulting colour, no see-through.
 */
const pinnedCellClass = cn(
  "bg-background",
  // Spelled out rather than built from a shared constant: Tailwind only sees
  // class names that appear literally in the source.
  "group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
  "group-has-aria-expanded/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
  "group-data-[state=selected]/row:bg-muted"
);

/** Geometry the dragged column carries while it is in flight. */
function getDragStyle(
  transform: Transform | null,
  transition: string | undefined,
  isDragging: boolean
): React.CSSProperties {
  return {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : undefined,
    zIndex: isDragging ? 2 : undefined,
  };
}

function DraggableTableHead<TData>({
  header,
}: {
  header: Header<TData, unknown>;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: header.column.id,
      // Keep the cell announcing itself as a column header — dnd-kit would
      // otherwise relabel it a button and lose the table semantics.
      attributes: { role: "columnheader" },
    });

  const onKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    // Enter and Space start a keyboard drag, and they are also how the sort
    // menu inside the header opens. Only the header itself may start the drag.
    if (event.target !== event.currentTarget) return;
    listeners?.onKeyDown?.(event);
  };

  return (
    <TableHead
      ref={setNodeRef}
      colSpan={header.colSpan}
      // `touch-none` is what lets a touch drag begin at all; the cost is that
      // the table can only be scrolled sideways by touching its body.
      className={cn(
        "touch-none select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        ...getColumnPinningStyle({ column: header.column }),
        ...getDragStyle(transform, transition, isDragging),
      }}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
    </TableHead>
  );
}

function DraggableTableCell<TData>({ cell }: { cell: Cell<TData, unknown> }) {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
  });

  return (
    <TableCell
      ref={setNodeRef}
      style={{
        ...getColumnPinningStyle({ column: cell.column }),
        ...getDragStyle(transform, transition, isDragging),
      }}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  onRowClick,
  ...props
}: DataTableProps<TData>) {
  const sensors = useSensors(
    // Anything shorter than the threshold stays a click, so the sort/hide
    // dropdown inside a header still opens on tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Only the columns that scroll can be reordered. A pinned column is placed by
  // `left`/`right` offsets that a drag transform would fight with, and it sits
  // outside the run of columns being sorted anyway.
  const centerColumns = table.getCenterVisibleLeafColumns();
  const sortableColumnIds = React.useMemo(
    () => centerColumns.map((column) => column.id),
    [centerColumns]
  );

  const leftPinned = table.getLeftVisibleLeafColumns();
  const rightPinned = table.getRightVisibleLeafColumns();
  const headerRef = React.useRef<HTMLTableSectionElement>(null);
  const [pinnedWidths, setPinnedWidths] = React.useState<
    Record<string, number>
  >({});

  // Re-measure whenever the set of pinned columns changes. Their ids are the
  // dependency, not the arrays — TanStack hands back a new array whenever any
  // part of the table state moves.
  const pinnedIds = [...leftPinned, ...rightPinned].map((c) => c.id).join(",");

  React.useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const cells = Array.from(
      header.querySelectorAll<HTMLTableCellElement>("th[data-pinned-column]")
    );
    if (cells.length === 0) return;

    const measure = () => {
      setPinnedWidths((previous) => {
        const next: Record<string, number> = {};
        let changed = Object.keys(previous).length !== cells.length;
        for (const cell of cells) {
          const id = cell.dataset.pinnedColumn as string;
          // offsetWidth over getBoundingClientRect: the rect picks up the drag
          // transform, which would feed a moving number back into the layout.
          next[id] = cell.offsetWidth;
          if (previous[id] !== next[id]) changed = true;
        }
        return changed ? next : previous;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const cell of cells) observer.observe(cell);
    return () => observer.disconnect();
  }, [pinnedIds]);

  const pinnedOffsets = React.useMemo(() => {
    const offsets: Record<string, number> = {};

    let fromLeft = 0;
    for (const column of leftPinned) {
      offsets[column.id] = fromLeft;
      fromLeft += pinnedWidths[column.id] ?? column.getSize();
    }

    let fromRight = 0;
    for (let i = rightPinned.length - 1; i >= 0; i--) {
      const column = rightPinned[i];
      offsets[column.id] = fromRight;
      fromRight += pinnedWidths[column.id] ?? column.getSize();
    }

    return offsets;
  }, [leftPinned, rightPinned, pinnedWidths]);

  const onDragEnd = React.useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;

      // The order state can be empty (meaning "as defined"), so take the live
      // order off the table instead — it already includes hidden columns, which
      // have to keep their place for when they come back.
      const order = table.getAllLeafColumns().map((column) => column.id);
      const from = order.indexOf(String(active.id));
      const to = order.indexOf(String(over.id));
      if (from === -1 || to === -1) return;

      table.setColumnOrder(arrayMove(order, from, to));
    },
    [table]
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-2 overflow-auto", className)}
      {...props}
    >
      {children}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={onDragEnd}
      >
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader ref={headerRef}>
              {table.getHeaderGroups().map((headerGroup) => (
                // The header row takes the same hover tint as any other row, so
                // its pinned cell has to follow along or it stays behind, white.
                <TableRow key={headerGroup.id} className="group/row">
                  <SortableContext
                    items={sortableColumnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) =>
                      header.column.getIsPinned() ? (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          data-pinned-column={header.column.id}
                          className={pinnedCellClass}
                          style={{
                            ...getColumnPinningStyle({
                              column: header.column,
                              offset: pinnedOffsets[header.column.id],
                              withBorder: true,
                            }),
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ) : (
                        <DraggableTableHead key={header.id} header={header} />
                      )
                    )}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn("group/row", onRowClick && "cursor-pointer")}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                  >
                    <SortableContext
                      items={sortableColumnIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      {row.getVisibleCells().map((cell) =>
                        cell.column.getIsPinned() ? (
                          <TableCell
                            key={cell.id}
                            className={pinnedCellClass}
                            style={{
                              ...getColumnPinningStyle({
                                column: cell.column,
                                offset: pinnedOffsets[cell.column.id],
                                withBorder: true,
                              }),
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ) : (
                          <DraggableTableCell key={cell.id} cell={cell} />
                        )
                      )}
                    </SortableContext>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}

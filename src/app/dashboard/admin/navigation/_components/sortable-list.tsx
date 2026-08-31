"use client";

import type { ReactNode } from "react";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import { isSortableOperation } from "@dnd-kit/react/sortable";

/**
 * Drag-and-drop wrapper around a `useFieldArray` list. Both the menu list and
 * every submenu list need the exact same drop handling, so it lives here once.
 */
export function SortableList({
  onReorder,
  children,
}: {
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  return (
    <DragDropProvider
      sensors={[PointerSensor]}
      onDragEnd={({ operation, canceled }) => {
        if (canceled || !isSortableOperation(operation)) return;
        const { source, target } = operation;
        if (!source || !target || source.initialIndex === target.index) return;
        onReorder(source.initialIndex, target.index);
      }}
    >
      {children}
    </DragDropProvider>
  );
}

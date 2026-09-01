"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Check, ChevronRight, GripVertical, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { MoveButtons } from "./move-buttons";
import { REVEAL, ROW_GROUP } from "./tree-row-style";

/**
 * A section header. There is no group table — renaming one rewrites `group` on
 * every menu inside it, and moving one carries its menus along.
 */
export function TreeGroupRow({
  name,
  index,
  count,
  collapsed,
  disabled,
  dragDisabled,
  ungrouped,
  canMoveUp,
  canMoveDown,
  onRename,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  name: string;
  index: number;
  count: number;
  collapsed: boolean;
  disabled: boolean;
  dragDisabled: boolean;
  /** Menus with no group — the sidebar draws no header for these. */
  ungrouped: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRename: (next: string) => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const { ref, handleRef, isDragging } = useSortable({
    id: `group:${name}`,
    index,
    disabled: disabled || dragDisabled,
  });

  const commit = () => {
    if (draft !== null) onRename(draft);
    setDraft(null);
  };

  const label = ungrouped ? "the pinned menus" : `section ${name}`;

  return (
    <div
      ref={ref}
      className={cn(
        ROW_GROUP,
        "flex h-8 items-center gap-1 pt-2",
        isDragging && "opacity-50"
      )}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Reorder ${label}`}
        disabled={disabled || dragDisabled}
        className={cn(
          REVEAL,
          "text-muted-foreground/60 hover:text-foreground flex size-5 shrink-0 cursor-grab items-center justify-center rounded disabled:cursor-default"
        )}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
        className="text-muted-foreground/60 hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded"
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform",
            !collapsed && "rotate-90"
          )}
        />
      </button>

      {draft === null ? (
        <>
          <span
            className={cn(
              "truncate text-[10px] font-medium tracking-[0.12em] uppercase",
              ungrouped
                ? "text-muted-foreground/60 italic"
                : "text-muted-foreground"
            )}
            // The sidebar prints no header here, so the editor says why.
            title={
              ungrouped
                ? "These menus sit above the sections and the sidebar shows no header for them."
                : undefined
            }
          >
            {ungrouped ? "No section" : name}
          </span>
          <span className="text-muted-foreground/50 shrink-0 text-[10px] tabular-nums">
            ({count})
          </span>

          {/* Nothing to rename when there is no name — drag a menu into a
              section, or type one in the detail pane, instead. */}
          {!ungrouped && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Rename section ${name}`}
              disabled={disabled}
              className={cn(REVEAL, "text-muted-foreground")}
              onClick={() => setDraft(name)}
            >
              <Pencil />
            </Button>
          )}

          <div className="ml-auto">
            <MoveButtons
              label={label}
              disabled={disabled}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          </div>
        </>
      ) : (
        <>
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") setDraft(null);
            }}
            className="h-6 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Save section name"
            onClick={commit}
          >
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Cancel rename"
            onClick={() => setDraft(null)}
          >
            <X />
          </Button>
        </>
      )}
    </div>
  );
}

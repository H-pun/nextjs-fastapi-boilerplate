"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import type { Navigation } from "@/lib/types/navigation";

import { SortableList } from "./sortable-list";
import { TreeBranch } from "./tree-branch";
import { TreeGroupRow } from "./tree-group-row";
import {
  UNGROUPED,
  buildRows,
  groupName,
  moveGroup,
  moveRow,
  renameGroup,
} from "./tree";

function matches(nav: Navigation, query: string) {
  const haystack = [
    nav.title,
    nav.url,
    ...(nav.children ?? []).map((c) => c.title),
  ];
  return haystack.some((value) => value.toLowerCase().includes(query));
}

/**
 * The sidebar as it will be rendered, and the only place order and section
 * membership are edited. Everything writes back through `onReplace` — sections
 * are derived from the `group` string, so moving a menu rewrites that string.
 */
export function MenuTree({
  navigations,
  selectedId,
  touched,
  hidden,
  hideRows,
  isLoading,
  search,
  onSelect,
  onAddSubmenu,
  onRemove,
  onReplace,
}: {
  navigations: Navigation[];
  selectedId: string | null;
  touched: Set<string>;
  /** Rows the previewed role would not see. Empty when nothing is previewed. */
  hidden: Set<string>;
  hideRows: boolean;
  isLoading: boolean;
  /** Owned by the page — the input sits in the toolbar above this pane. */
  search: string;
  onSelect: (id: string) => void;
  /** Takes a position in `navigations`, not a row position. */
  onAddSubmenu: (parentIndex: number) => void;
  /** `childIndex` is -1 for a top-level menu, matching the detail pane. */
  onRemove: (parentIndex: number, childIndex: number) => void;
  onReplace: (next: Navigation[]) => void;
}) {
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    {}
  );
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const query = search.trim().toLowerCase();
  const rows = useMemo(() => buildRows(navigations), [navigations]);

  // Hiding rows leaves gaps in the sortable indices, so dragging is off while
  // anything is filtered or folded away. The arrow buttons stay on, except in
  // the role preview, where the pane is a read-only projection.
  const visible = useMemo(() => {
    if (!query && !hideRows) return null;
    const keep = new Set<number>();
    navigations.forEach((nav, index) => {
      if (query && !matches(nav, query)) return;
      if (hideRows && hidden.has(nav.id)) return;
      keep.add(index);
    });
    return keep;
  }, [navigations, query, hideRows, hidden]);

  const anyCollapsed = Object.values(collapsedSections).some(Boolean);
  const dragDisabled = !!query || anyCollapsed || hideRows;

  const sectionHasMatch = (name: string) =>
    !visible ||
    navigations.some(
      (nav, index) => groupName(nav) === name && visible.has(index)
    );

  // The arrows step one row at a time through the full tree, so they may only
  // be offered when that neighbouring row is actually on screen. Otherwise the
  // menu moves for real while nothing visibly changes — or slips into another
  // section behind a filtered-out header.
  const isRowVisible = (position: number) => {
    const row = rows[position];
    if (!row) return false;
    if (row.kind === "group") return sectionHasMatch(row.name);
    if (visible && !visible.has(row.index)) return false;
    return !collapsedSections[groupName(navigations[row.index])];
  };

  const reorderChildren = (parentIndex: number, from: number, to: number) => {
    const children = [...(navigations[parentIndex].children ?? [])];
    if (to < 0 || to >= children.length) return;
    const [moved] = children.splice(from, 1);
    children.splice(to, 0, moved);
    onReplace(
      navigations.map((nav, index) =>
        index === parentIndex ? { ...nav, children } : nav
      )
    );
  };

  const groupCount = rows.filter((row) => row.kind === "group").length;
  let groupIndex = -1;

  return (
    <div className="flex flex-col gap-2">
      {visible?.size === 0 ? (
        <p className="text-muted-foreground px-2 py-6 text-center text-sm">
          {query
            ? `No menu matches “${search.trim()}”.`
            : "This role sees no menu at all — its sidebar would be empty."}
        </p>
      ) : (
        // No scroll container: the whole menu is meant to be readable at a
        // glance, and the detail pane sticks instead.
        <div className="space-y-0.5">
          {/* Hidden rows leave gaps in the sortable indices, so dragging has to
              be off here. Without a word about it a dead drag handle just
              reads as a broken feature. */}
          {dragDisabled && (
            <p className="text-muted-foreground bg-muted/50 mb-1 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>
                {query
                  ? "Reordering is off while searching. Clear the search to rearrange."
                  : hideRows
                    ? "Reordering is off while the tree is filtered to one role. Turn the switch off to rearrange."
                    : "Reordering is off while a section is collapsed. Expand it to rearrange."}
              </span>
            </p>
          )}
          <SortableList
            onReorder={(from, to) => onReplace(moveRow(navigations, from, to))}
          >
            {rows.map((row, index) => {
              if (row.kind === "group") {
                groupIndex++;
                if (!sectionHasMatch(row.name)) return null;

                const position = groupIndex;
                const count = navigations.filter(
                  (nav) => groupName(nav) === row.name
                ).length;

                return (
                  <TreeGroupRow
                    key={`group:${row.name}`}
                    name={row.name}
                    index={index}
                    count={count}
                    collapsed={!!collapsedSections[row.name]}
                    disabled={isLoading}
                    dragDisabled={dragDisabled}
                    ungrouped={row.name === UNGROUPED}
                    // Sections move as whole blocks past sections that may be
                    // filtered away, so that stays off while searching.
                    canMoveUp={!query && !hideRows && position > 0}
                    canMoveDown={
                      !query && !hideRows && position < groupCount - 1
                    }
                    onRename={(next) =>
                      onReplace(renameGroup(navigations, row.name, next))
                    }
                    onToggle={() =>
                      setCollapsedSections((state) => ({
                        ...state,
                        [row.name]: !state[row.name],
                      }))
                    }
                    onMoveUp={() =>
                      onReplace(moveGroup(navigations, position, position - 1))
                    }
                    onMoveDown={() =>
                      onReplace(moveGroup(navigations, position, position + 1))
                    }
                  />
                );
              }

              const nav = navigations[row.index];
              if (visible && !visible.has(row.index)) return null;
              if (collapsedSections[groupName(nav)]) return null;

              const hasSelectedChild = (nav.children ?? []).some(
                (child) => child.id === selectedId
              );

              return (
                <TreeBranch
                  key={nav.id}
                  nav={nav}
                  index={index}
                  selectedId={selectedId}
                  touched={touched}
                  hidden={hidden}
                  hideRows={hideRows}
                  // Open by default, and never collapsed over the row being
                  // edited or over a search hit.
                  expanded={
                    !collapsedMenus[nav.id] || hasSelectedChild || !!query
                  }
                  disabled={isLoading}
                  dragDisabled={dragDisabled}
                  canMoveUp={!hideRows && isRowVisible(index - 1)}
                  canMoveDown={!hideRows && isRowVisible(index + 1)}
                  onSelect={onSelect}
                  onToggle={() =>
                    setCollapsedMenus((state) => ({
                      ...state,
                      [nav.id]: !state[nav.id],
                    }))
                  }
                  onMove={(offset) =>
                    onReplace(moveRow(navigations, index, index + offset))
                  }
                  onAddSubmenu={() => onAddSubmenu(row.index)}
                  onRemove={() => onRemove(row.index, -1)}
                  onRemoveChild={(childIndex) =>
                    onRemove(row.index, childIndex)
                  }
                  onReorderChildren={(from, to) =>
                    reorderChildren(row.index, from, to)
                  }
                />
              );
            })}
          </SortableList>
        </div>
      )}
    </div>
  );
}

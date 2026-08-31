"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowUpRight,
  ChevronRight,
  EyeOff,
  GripVertical,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import type { IconName } from "lucide-react/dynamic";

import { NavIcon } from "@/components/nav-icon";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Navigation } from "@/lib/types/navigation";

import { MoveButtons } from "./move-buttons";
import { SortableList } from "./sortable-list";
import { isSelfMenu } from "./tree";
import { FADE_UNDER_ACTIONS, REVEAL, ROW_GROUP } from "./tree-row-style";

function MenuIcon({ icon }: { icon?: string | null }) {
  // A dashed placeholder rather than nothing: a missing icon is a real gap in
  // the sidebar and should be visible without opening the row.
  if (!icon) {
    return (
      <span
        className="border-muted-foreground/40 size-4 shrink-0 rounded-[3px] border border-dashed"
        aria-label="No icon"
      />
    );
  }
  return <NavIcon name={icon as IconName} className="size-4 shrink-0" />;
}

/**
 * The label half of a row. The highlight lives on the row wrapper rather than
 * here, so the floating controls can inherit it and cut a long title off
 * against a matching colour instead of a hard transparent edge.
 */
function RowButton({
  nav,
  icon,
  selected,
  touched,
  hidden,
  onSelect,
}: {
  nav: Navigation;
  icon: boolean;
  selected: boolean;
  touched: boolean;
  hidden: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "focus-visible:ring-ring/50 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none",
        FADE_UNDER_ACTIONS,
        selected && "font-medium",
        hidden && "opacity-45"
      )}
    >
      {icon && <MenuIcon icon={nav.icon} />}
      <span className="truncate">{nav.title || "Untitled"}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {hidden && (
          <span title="This role does not see this menu" className="flex">
            <EyeOff
              className="text-muted-foreground size-3"
              aria-label="Hidden from the previewed role"
            />
          </span>
        )}
        {touched && (
          <span
            className="bg-primary size-1.5 rounded-full"
            title="Edited — not saved yet"
            aria-label="Edited, not saved yet"
          />
        )}
        {/* Wrapped rather than titled directly: a `title` on the dot above is
            what already carries hover text in this row, and an svg reads it
            less reliably than its parent. */}
        {nav.external && (
          <span
            title="Opens in a new tab instead of navigating in place"
            className="flex"
          >
            <ArrowUpRight
              className="text-muted-foreground size-3"
              aria-label="Opens in a new tab"
            />
          </span>
        )}
      </span>
    </button>
  );
}

const rowShell = (selected: boolean) =>
  cn(
    ROW_GROUP,
    "relative flex items-center gap-1 rounded-md",
    selected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
  );

/** How far the controls reach in from the right, per row kind. */
const BRANCH_ACTIONS = { "--actions-w": "6.5rem" } as React.CSSProperties;
const LEAF_ACTIONS = { "--actions-w": "4.75rem" } as React.CSSProperties;

/**
 * The controls sit on top of the row instead of beside it: four of them in the
 * flow left roughly a third of a 22rem pane to the menu title. Nothing here is
 * painted — the label fades itself out underneath (see FADE_UNDER_ACTIONS), so
 * the controls need no backdrop to stay legible.
 */
function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 group-hover/row:pointer-events-auto group-focus-within/row:pointer-events-auto">
      {children}
    </div>
  );
}

/**
 * Remove, or the reason there is no remove. A disabled button would take no
 * pointer events and so could never explain itself on hover, and dropping the
 * control entirely would leave the row's controls out of line with its
 * neighbours — the lock keeps the slot and says why.
 */
function RemoveButton({
  nav,
  label,
  disabled,
  onRemove,
}: {
  nav: Navigation;
  label: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  if (isSelfMenu(nav)) {
    return (
      <span
        title="This is the sidebar link to this page — remove it and the menu manager is only reachable by typing its address"
        className={cn(
          REVEAL,
          "flex size-6 shrink-0 items-center justify-center"
        )}
      >
        <Lock className="text-muted-foreground/60 size-3" aria-label="Locked" />
      </span>
    );
  }

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove ${label}`}
          disabled={disabled}
          className={cn(
            REVEAL,
            "text-muted-foreground hover:text-destructive shrink-0"
          )}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remove</TooltipContent>
    </Tooltip>
  );
}

/**
 * One menu in the tree plus its submenus, painted the way the sidebar paints
 * it so the pane reads as a preview rather than a list of records.
 */
export function TreeBranch({
  nav,
  index,
  selectedId,
  touched,
  hidden,
  hideRows,
  expanded,
  disabled,
  dragDisabled,
  canMoveUp,
  canMoveDown,
  onSelect,
  onToggle,
  onMove,
  onAddSubmenu,
  onRemove,
  onRemoveChild,
  onReorderChildren,
}: {
  nav: Navigation;
  index: number;
  selectedId: string | null;
  touched: Set<string>;
  hidden: Set<string>;
  hideRows: boolean;
  expanded: boolean;
  disabled: boolean;
  dragDisabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: (id: string) => void;
  onToggle: () => void;
  onMove: (offset: number) => void;
  onAddSubmenu: () => void;
  onRemove: () => void;
  onRemoveChild: (childIndex: number) => void;
  onReorderChildren: (from: number, to: number) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: nav.id,
    index,
    disabled: disabled || dragDisabled,
  });

  const children = nav.children ?? [];

  // `index` stays the position in `nav.children`: the callbacks below write
  // back into that array, so dropping rows must not renumber them.
  const shownChildren = children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => !hideRows || !hidden.has(child.id));

  return (
    <div ref={ref} className={cn(isDragging && "opacity-50")}>
      <div className={rowShell(selectedId === nav.id)} style={BRANCH_ACTIONS}>
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${nav.title || "menu"}`}
          disabled={disabled || dragDisabled}
          className={cn(
            REVEAL,
            "text-muted-foreground/60 hover:text-foreground flex size-5 shrink-0 cursor-grab items-center justify-center rounded disabled:cursor-default"
          )}
        >
          <GripVertical className="size-3.5" />
        </button>

        {children.length > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${nav.title}`}
            className="text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        <RowButton
          nav={nav}
          icon
          selected={selectedId === nav.id}
          touched={touched.has(nav.id)}
          hidden={hidden.has(nav.id)}
          onSelect={() => onSelect(nav.id)}
        />

        <RowActions>
          {/* Only top-level menus take submenus, so this sits on the branch and
              not on the leaf below. */}
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Add a submenu under ${nav.title || "this menu"}`}
                disabled={disabled}
                className={cn(REVEAL, "text-muted-foreground shrink-0")}
                onClick={onAddSubmenu}
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add submenu</TooltipContent>
          </Tooltip>

          <MoveButtons
            label={nav.title || "menu"}
            disabled={disabled}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => onMove(-1)}
            onMoveDown={() => onMove(1)}
          />

          <RemoveButton
            nav={nav}
            label={nav.title || "menu"}
            disabled={disabled}
            onRemove={onRemove}
          />
        </RowActions>
      </div>

      {expanded && shownChildren.length > 0 && (
        <div className="border-border/60 mt-0.5 ml-[1.4rem] space-y-0.5 border-l pl-2">
          <SortableList onReorder={onReorderChildren}>
            {shownChildren.map(({ child, index: childIndex }, position) => (
              <TreeLeaf
                key={child.id}
                child={child}
                index={position}
                selected={selectedId === child.id}
                touched={touched.has(child.id)}
                hidden={hidden.has(child.id)}
                disabled={disabled}
                dragDisabled={dragDisabled}
                canMoveUp={!hideRows && position > 0}
                canMoveDown={!hideRows && position < shownChildren.length - 1}
                onSelect={onSelect}
                onMove={(offset) => {
                  const target = shownChildren[position + offset];
                  if (target) onReorderChildren(childIndex, target.index);
                }}
                onRemove={() => onRemoveChild(childIndex)}
              />
            ))}
          </SortableList>
        </div>
      )}
    </div>
  );
}

function TreeLeaf({
  child,
  index,
  selected,
  touched,
  hidden,
  disabled,
  dragDisabled,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMove,
  onRemove,
}: {
  child: Navigation;
  index: number;
  selected: boolean;
  touched: boolean;
  hidden: boolean;
  disabled: boolean;
  dragDisabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: (id: string) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: child.id,
    index,
    disabled: disabled || dragDisabled,
  });

  return (
    <div
      ref={ref}
      className={cn(rowShell(selected), isDragging && "opacity-50")}
      style={LEAF_ACTIONS}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Reorder ${child.title || "submenu"}`}
        disabled={disabled || dragDisabled}
        className={cn(
          REVEAL,
          "text-muted-foreground/60 hover:text-foreground flex size-5 shrink-0 cursor-grab items-center justify-center rounded disabled:cursor-default"
        )}
      >
        <GripVertical className="size-3.5" />
      </button>
      <RowButton
        nav={child}
        icon={false}
        selected={selected}
        touched={touched}
        hidden={hidden}
        onSelect={() => onSelect(child.id)}
      />
      <RowActions>
        <MoveButtons
          label={child.title || "submenu"}
          disabled={disabled}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={() => onMove(-1)}
          onMoveDown={() => onMove(1)}
        />
        <RemoveButton
          nav={child}
          label={child.title || "submenu"}
          disabled={disabled}
          onRemove={onRemove}
        />
      </RowActions>
    </div>
  );
}

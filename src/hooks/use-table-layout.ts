"use client";

import type { ColumnOrderState, ColumnPinningState } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import * as React from "react";

const STORAGE_PREFIX = "app:table-layout:";

export interface TableLayout {
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
}

/**
 * Nothing outside this hook writes the key, and every write already goes
 * through the override state, so there is no external change to listen for.
 */
function subscribe() {
  return () => {};
}

const cache = new Map<
  string,
  { raw: string | null; layout: TableLayout | null }
>();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string");
}

function readLayout(storageKey: string): TableLayout | null {
  const raw = localStorage.getItem(storageKey);
  const cached = cache.get(storageKey);
  // useSyncExternalStore compares snapshots by identity — a fresh object on
  // every call would re-render forever.
  if (cached && cached.raw === raw) return cached.layout;

  let layout: TableLayout | null = null;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<TableLayout> | null;
      if (isStringArray(parsed?.columnOrder)) {
        layout = {
          columnOrder: parsed.columnOrder,
          columnPinning: {
            left: isStringArray(parsed.columnPinning?.left)
              ? parsed.columnPinning.left
              : [],
            right: isStringArray(parsed.columnPinning?.right)
              ? parsed.columnPinning.right
              : [],
          },
        };
      }
    } catch {
      layout = null;
    }
  }

  cache.set(storageKey, { raw, layout });
  return layout;
}

/**
 * Column order and pinning, remembered per table across reloads.
 *
 * The stored ids are never reconciled against the current columns: TanStack
 * skips ids it does not know and appends columns the stored order never
 * mentioned, so a table that gained or lost a column since the last visit still
 * renders every column it has.
 *
 * `persistKey` defaults to the pathname, which is enough while each table owns
 * its own route — a page with two tables has to name them apart.
 */
export function useTableLayout(defaults: TableLayout, persistKey?: string) {
  const pathname = usePathname();
  const storageKey = `${STORAGE_PREFIX}${persistKey ?? pathname}`;

  const stored = React.useSyncExternalStore(
    subscribe,
    () => readLayout(storageKey),
    () => null,
  );
  const [override, setOverride] = React.useState<TableLayout | null>(null);

  const layout = override ?? stored ?? defaults;

  const setLayout = React.useCallback(
    (next: TableLayout) => {
      setOverride(next);
      cache.delete(storageKey);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const reset = React.useCallback(() => {
    setOverride(null);
    cache.delete(storageKey);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { layout, setLayout, reset };
}

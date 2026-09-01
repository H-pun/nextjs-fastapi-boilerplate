"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import * as React from "react";

import { DEFAULT_QUERY_KEYS } from "@/components/data-table/data-table-query-keys";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import type { QueryKeys } from "@/types/data-table";

const STORAGE_PREFIX = "app:table-state:";

/**
 * The parts of the URL that describe how someone is looking at a table.
 *
 * `page` is deliberately absent: it is a reading position, not a preference.
 * Returning to page 7 of a list that has since shrunk lands on nothing, and
 * nobody comes back to a screen expecting to resume mid-scroll.
 */
function rememberedKeys(keys: QueryKeys) {
  return [
    keys.view,
    keys.search,
    keys.sort,
    keys.filters,
    keys.joinOperator,
    keys.perPage,
  ];
}

function read(params: URLSearchParams, keys: string[]) {
  const next = new URLSearchParams();
  // Fixed key order, so an unchanged view always serialises to the same string
  // and the write effect has nothing to react to.
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null) next.set(key, value);
  }
  return next.toString();
}

/**
 * Carries a table's view, search, sort and filters across a visit to another
 * page — the URL alone cannot, because the sidebar links to a bare path.
 *
 * The URL still wins whenever it says anything at all, so a link someone shared
 * opens the way they left it rather than the way the recipient last sat.
 */
export function useTableMemory(
  persistKey?: string,
  queryKeys: QueryKeys = DEFAULT_QUERY_KEYS,
  /** The columns this table actually has, so a stale key is not restored. */
  columnIds?: Set<string>
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `${STORAGE_PREFIX}${persistKey ?? pathname}`;

  const keys = React.useMemo(() => rememberedKeys(queryKeys), [queryKeys]);

  /**
   * The same parsers the controls themselves hold these keys with.
   *
   * Not a detail: nuqs syncs two hooks on one key by handing the writer's
   * **parsed value** to the reader, with no second parse. Restoring `filters`
   * through `parseAsString` therefore put a raw JSON string where the filter
   * list keeps its array — `length` still answered, so the list rendered and
   * then died on `.map`. Same shape of bug waited in `sort` and `perPage`.
   */
  const parsers = React.useMemo(
    () => ({
      [queryKeys.view]: parseAsString,
      [queryKeys.search]: parseAsString,
      [queryKeys.joinOperator]: parseAsString,
      [queryKeys.perPage]: parseAsInteger,
      [queryKeys.sort]: getSortingStateParser(columnIds),
      [queryKeys.filters]: getFiltersStateParser(columnIds),
    }),
    [queryKeys, columnIds]
  );

  // Restored through nuqs rather than the router: the search box, filter list
  // and sort list hold these keys through nuqs, and a plain navigation past it
  // puts values in the URL that those controls never hear about.
  const [, setQuery] = useQueryStates(parsers, {
    shallow: false,
    history: "replace",
    scroll: false,
  });

  const serialised = read(new URLSearchParams(searchParams.toString()), keys);

  // idle → nothing decided yet; restoring → waiting for the write to land;
  // live → the URL is the truth and worth remembering.
  const phase = React.useRef<"idle" | "restoring" | "live">("idle");

  React.useEffect(() => {
    if (phase.current !== "idle") return;

    if (serialised) {
      phase.current = "live";
      return;
    }

    const stored = localStorage.getItem(storageKey);
    // Read back through the whitelist rather than replayed as-is: the stored
    // string is caller-writable, and this also drops keys left by an older
    // version of this list.
    const restored = stored
      ? new URLSearchParams(read(new URLSearchParams(stored), keys))
      : null;

    if (!restored || ![...restored.keys()].length) {
      phase.current = "live";
      return;
    }

    phase.current = "restoring";
    void setQuery(
      Object.fromEntries(
        keys.map((key) => {
          const raw = restored.get(key);
          // `parse` answers null for anything it does not recognise, which
          // clears the key rather than restoring a value no control can hold.
          return [
            key,
            raw === null ? null : (parsers[key]?.parse(raw) ?? null),
          ];
        })
      )
    );
  }, [serialised, setQuery, storageKey, keys, parsers]);

  React.useEffect(() => {
    if (phase.current === "restoring") {
      if (serialised) phase.current = "live";
      return;
    }
    if (phase.current !== "live") return;

    // An empty URL now means the user cleared everything, which is itself worth
    // remembering — the next visit should start clean rather than undo them.
    if (serialised) localStorage.setItem(storageKey, serialised);
    else localStorage.removeItem(storageKey);
  }, [serialised, storageKey]);
}

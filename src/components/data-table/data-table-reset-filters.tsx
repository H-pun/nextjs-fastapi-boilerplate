"use client";

import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";

import { useDataTableQueryKeys } from "@/components/data-table/data-table-query-keys";
import { Button } from "@/components/ui/button";

/**
 * Clears the narrowing the user applied — search, sort, filters — and nothing
 * else. The view toggle and page size are how they prefer to read the table,
 * not a question they asked of it, so both survive.
 *
 * Absent until there is something to clear: a permanently visible Reset reads
 * as if the table were filtered when it is not.
 */
export function DataTableResetFilters() {
  const searchParams = useSearchParams();
  // The toolbar names these after its own table, so a page with two tables
  // clears the one the button belongs to rather than both.
  const keys = useDataTableQueryKeys();

  // `page` rides along because the row it pointed at is gone once the narrowing
  // is, but it is not itself a reason to offer the button.
  const cleared = useMemo(
    () => [keys.search, keys.sort, keys.filters, keys.joinOperator, keys.page],
    [keys]
  );
  const counted = useMemo(
    () => [keys.search, keys.sort, keys.filters],
    [keys]
  );

  const parsers = useMemo(
    () => Object.fromEntries(cleared.map((key) => [key, parseAsString])),
    [cleared]
  );

  // Written through nuqs, not the router: the filter and sort lists hold these
  // same keys through nuqs, and a plain navigation past it leaves them showing
  // state the URL no longer has. `shallow: false` so the page's own query key,
  // which it reads off `useSearchParams`, moves with it.
  const [, clear] = useQueryStates(parsers, {
    shallow: false,
    history: "replace",
  });

  if (!counted.some((key) => searchParams.get(key))) return null;

  return (
    <Button
      variant="ghost"
      className="font-normal"
      onClick={() =>
        void clear(Object.fromEntries(cleared.map((key) => [key, null])))
      }
    >
      <X className="text-muted-foreground" />
      Reset
    </Button>
  );
}

"use client";

import * as React from "react";

import type { QueryKeys } from "@/types/data-table";

/** What a table's state is called in the URL when nothing renames it. */
export const DEFAULT_QUERY_KEYS: QueryKeys = {
  page: "page",
  perPage: "perPage",
  sort: "sort",
  filters: "filters",
  joinOperator: "joinOperator",
  search: "search",
  view: "view",
};

const QueryKeysContext = React.createContext<QueryKeys>(DEFAULT_QUERY_KEYS);

/**
 * Carries a table's own param names down to the controls that write them.
 *
 * The search box and the reset button sit anywhere inside the toolbar and never
 * receive the table, so passing the names down by prop would mean threading
 * them through every page that renders a toolbar. The default keeps a control
 * used outside a toolbar working on the plain names.
 */
export function DataTableQueryKeysProvider({
  keys,
  children,
}: {
  keys?: QueryKeys;
  children: React.ReactNode;
}) {
  return (
    <QueryKeysContext.Provider value={keys ?? DEFAULT_QUERY_KEYS}>
      {children}
    </QueryKeysContext.Provider>
  );
}

export function useDataTableQueryKeys() {
  return React.useContext(QueryKeysContext);
}

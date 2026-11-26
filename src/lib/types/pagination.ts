export interface Pagination<T> {
  totalItems: number;
  totalPages: number;
  pageSize: number;
  page: number;
  items: T[];
  groupBy?: string | null;
  groups?: GroupSummary[] | null;
  /** Parallel to `items` when the API grouped the response. */
  itemGroupKeys?: string[] | null;
}

export interface GroupSummary {
  id: string;
  label: string;
  count: number;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
  search?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  /** JSON-encoded data-table filters forwarded to the API. */
  filters?: string;
  /** JSON-encoded multi-column sorting forwarded to the API. */
  sort?: string;
  joinOperator?: "and" | "or";
  /** Column id for server-side row grouping. */
  groupBy?: string;
  /**
   * Infinite scroll: skip COUNT + group summaries on page > 1.
   * Totals still come from the first page response.
   */
  skipListMeta?: boolean;
}

export const defaultPaginationQuery: PaginationQuery = {
  page: 1,
  pageSize: 10,
  search: "",
};

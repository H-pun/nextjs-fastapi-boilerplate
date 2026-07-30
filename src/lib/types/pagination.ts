export interface Pagination<T> {
  totalItems: number; // Total number of items (before pagination)
  totalPages: number; // Total number of pages
  pageSize: number; // Number of items per page
  page: number; // Current page number
  items: T[]; // Paged items
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
  search?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export const defaultPaginationQuery: PaginationQuery = {
  page: 1,
  pageSize: 10,
  search: "",
};

/** Shared list-query parsing for master-data repositories. */

export interface ListQuery {
  q?: string;
  /** "active" | "inactive" | "archived" | "draft" | undefined (all) */
  status?: string;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parse raw search params (from a Next route) into a safe ListQuery. */
export function parseListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  opts: { pageSize?: number } = {},
): ListQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const page = Math.max(1, Number.parseInt(first(searchParams.page) ?? "1", 10) || 1);
  const q = first(searchParams.q)?.trim() || undefined;
  const status = first(searchParams.status)?.trim() || undefined;
  const pageSize = Math.min(MAX_PAGE_SIZE, opts.pageSize ?? DEFAULT_PAGE_SIZE);
  return { q, status, page, pageSize };
}

export function paginationArgs(query: ListQuery) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

import type { DataGridQuery } from '../core/grid.types';
import type { FilterGroup } from '../features/filtering/filter.types';
import { createOperatorRegistry, type FilterOperatorRegistry } from '../features/filtering/filter.operators';
import { pruneFilterModel } from '../features/filtering/filter.model';

export interface ServerSortItem {
  field: string;
  direction: 'asc' | 'desc';
}

/** Backend-friendly shape of the grid query (framework agnostic). */
export interface ServerQuery {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  sort: ServerSortItem[];
  /** Filter model with empty / incomplete conditions removed (`null` = no filter). */
  filter: FilterGroup | null;
  search: string;
}

const defaultRegistry = createOperatorRegistry();

/** Normalises a {@link DataGridQuery} for REST / GraphQL backends. */
export function toServerQuery(query: DataGridQuery, registry: FilterOperatorRegistry = defaultRegistry): ServerQuery {
  const { pageIndex, pageSize } = query.pagination;
  return {
    page: pageIndex + 1,
    pageSize,
    offset: pageIndex * pageSize,
    limit: pageSize,
    sort: query.sorting.map((s) => ({ field: s.id, direction: s.desc ? 'desc' : 'asc' })),
    filter: pruneFilterModel(query.filterModel, registry),
    search: query.globalFilter.trim(),
  };
}

/**
 * Serialises a query to URL search params, e.g.
 * `?page=2&pageSize=25&sort=name:asc,salary:desc&search=ann&filter={...}`.
 */
export function toSearchParams(query: DataGridQuery, registry?: FilterOperatorRegistry): URLSearchParams {
  const q = toServerQuery(query, registry);
  const params = new URLSearchParams();
  params.set('page', String(q.page));
  params.set('pageSize', String(q.pageSize));
  if (q.sort.length) params.set('sort', q.sort.map((s) => `${s.field}:${s.direction}`).join(','));
  if (q.search) params.set('search', q.search);
  if (q.filter) params.set('filter', JSON.stringify(q.filter));
  return params;
}

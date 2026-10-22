import type { Column, RowData, Table } from '@tanstack/react-table';
import type { FilterOption, FilterVariant } from './filter.types';

const MAX_DERIVED_OPTIONS = 500;

export function getColumnFilterVariant<TData extends RowData>(column: Column<TData, unknown>): FilterVariant {
  return column.columnDef.meta?.filterVariant ?? 'text';
}

/**
 * Options for select-like filters: `meta.filterOptions` when configured, otherwise
 * the distinct values present in the loaded (pre-filter) rows, capped at 500.
 */
export function getColumnFilterOptions<TData extends RowData>(table: Table<TData>, column: Column<TData, unknown>): FilterOption[] {
  const configured = column.columnDef.meta?.filterOptions ?? column.columnDef.meta?.editorOptions;
  if (configured) return [...configured];
  if (!column.accessorFn) return [];
  const seen = new Set<string>();
  for (const row of table.getCoreRowModel().flatRows) {
    const value = row.getValue(column.id);
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      seen.add(String(v));
      if (seen.size >= MAX_DERIVED_OPTIONS) break;
    }
    if (seen.size >= MAX_DERIVED_OPTIONS) break;
  }
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((v) => ({ value: v, label: v }));
}

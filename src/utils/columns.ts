import type { Column, RowData } from '@tanstack/react-table';
import type { ColumnAlign } from '../core/column-meta';

/** Plain-text label for a column (string header, else `meta.exportHeader`, else id). */
export function getColumnLabel<TData extends RowData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  if (typeof header === 'string') return header;
  return column.columnDef.meta?.exportHeader ?? column.id;
}

export function getColumnAlign<TData extends RowData>(column: Column<TData, unknown>): ColumnAlign {
  const meta = column.columnDef.meta;
  if (meta?.align) return meta.align;
  return meta?.filterVariant === 'number' ? 'right' : 'left';
}

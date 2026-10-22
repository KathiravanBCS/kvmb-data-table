import type { Column, Row, RowData, Table } from '@tanstack/react-table';

/**
 * Which rows to export.
 * - `all`: every client-side row before filtering (only rows loaded into the grid).
 * - `filtered`: rows passing the current filters, in the current sort order.
 * - `selected`: selected rows (in filtered/sorted order where possible).
 * - `page`: rows on the current page.
 */
export type ExportRowScope = 'all' | 'filtered' | 'selected' | 'page';

/** Which columns to export: visible columns (in display order), all leaf columns, or explicit ids. */
export type ExportColumnScope = 'visible' | 'all' | readonly string[];

export interface BaseExportOptions<TData extends RowData> {
  rows?: ExportRowScope;
  columns?: ExportColumnScope;
  /** File name without extension handling; the extension is appended if missing. */
  filename?: string;
  /** Include a header row. Default `true`. */
  includeHeaders?: boolean;
  /** Customise header text per column. */
  getHeader?: (column: Column<TData, unknown>) => string;
  /** Customise exported value per cell. Overrides `meta.exportValue`. */
  getValue?: (row: Row<TData>, column: Column<TData, unknown>) => unknown;
}

const INTERNAL_COLUMN_PREFIX = '__dg_';

export function isInternalColumnId(id: string): boolean {
  return id.startsWith(INTERNAL_COLUMN_PREFIX);
}

export function resolveExportColumns<TData extends RowData>(
  table: Table<TData>,
  scope: ExportColumnScope = 'visible',
): Column<TData, unknown>[] {
  let columns: Column<TData, unknown>[];
  if (scope === 'visible') columns = table.getVisibleLeafColumns();
  else if (scope === 'all') columns = table.getAllLeafColumns();
  else {
    const ids = scope;
    columns = ids.map((id) => table.getColumn(id)).filter((c): c is Column<TData, unknown> => !!c);
  }
  return columns.filter(
    (c) => !isInternalColumnId(c.id) && c.columnDef.meta?.exportable !== false && (c.accessorFn || c.columnDef.meta?.exportValue),
  );
}

function leafRows<TData extends RowData>(rows: Row<TData>[]): Row<TData>[] {
  const out: Row<TData>[] = [];
  const visit = (list: Row<TData>[]) => {
    for (const row of list) {
      if (row.getIsGrouped()) visit(row.subRows);
      else out.push(row);
    }
  };
  visit(rows);
  return out;
}

export function resolveExportRows<TData extends RowData>(table: Table<TData>, scope: ExportRowScope = 'filtered'): Row<TData>[] {
  switch (scope) {
    case 'all':
      return table.getCoreRowModel().flatRows;
    case 'page':
      return leafRows(table.getPaginationRowModel().rows);
    case 'selected': {
      const selected = table.getState().rowSelection;
      const ordered = leafRows(table.getSortedRowModel().rows).filter((r) => selected[r.id]);
      // Selected rows hidden by filters (or not in the filtered model) are still exported.
      const seen = new Set(ordered.map((r) => r.id));
      for (const r of table.getCoreRowModel().flatRows) {
        if (selected[r.id] && !seen.has(r.id)) ordered.push(r);
      }
      return ordered;
    }
    case 'filtered':
    default:
      return leafRows(table.getSortedRowModel().rows);
  }
}

export function getExportHeader<TData extends RowData>(column: Column<TData, unknown>): string {
  const meta = column.columnDef.meta;
  if (meta?.exportHeader) return meta.exportHeader;
  const header = column.columnDef.header;
  if (typeof header === 'string') return header;
  return column.id;
}

export function getExportValue<TData extends RowData>(row: Row<TData>, column: Column<TData, unknown>): unknown {
  const value = column.accessorFn ? row.getValue(column.id) : undefined;
  const meta = column.columnDef.meta;
  if (meta?.exportValue) return meta.exportValue(row.original, value);
  return value;
}

export function ensureExtension(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
}

/** Triggers a browser download. No-op outside the browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

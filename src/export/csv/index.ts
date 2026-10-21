import type { RowData, Table } from '@tanstack/react-table';
import {
  downloadBlob,
  ensureExtension,
  getExportHeader,
  getExportValue,
  resolveExportColumns,
  resolveExportRows,
  type BaseExportOptions,
} from '../shared';

export interface CsvExportOptions<TData extends RowData> extends BaseExportOptions<TData> {
  /** Field delimiter. Default `,`. */
  delimiter?: string;
  /** Line separator. Default `\r\n` (RFC 4180). */
  lineSeparator?: string;
  /** Prefix a UTF-8 byte-order mark so Excel detects the encoding. Default `true`. */
  bom?: boolean;
  /** Trigger a browser download. Default `true`. */
  download?: boolean;
  /**
   * Neutralise spreadsheet formula injection by prefixing cells starting with
   * `=`, `+`, `-`, `@`, tab or CR with a single quote. Default `true`.
   */
  escapeFormulas?: boolean;
}

export interface CsvExportResult {
  csv: string;
  filename: string;
  rowCount: number;
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** Serialises any value into a CSV cell (without quoting). */
export function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (Array.isArray(value)) return value.map(formatCsvValue).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Quotes a CSV cell when needed (RFC 4180). */
export function escapeCsvCell(text: string, delimiter = ',', escapeFormulas = true): string {
  let out = text;
  if (escapeFormulas && FORMULA_START.test(out) && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(out)) {
    out = `'${out}`;
  }
  const needsQuotes = out.includes('"') || out.includes(delimiter) || /[\r\n]/.test(out) || /^\s|\s$/.test(out);
  if (out.includes('"')) out = out.replace(/"/g, '""');
  return needsQuotes ? `"${out}"` : out;
}

/** Builds a CSV string from a 2D array of values. */
export function toCsv(
  rows: readonly (readonly unknown[])[],
  { delimiter = ',', lineSeparator = '\r\n', escapeFormulas = true } = {},
): string {
  return rows
    .map((r) => r.map((v) => escapeCsvCell(formatCsvValue(v), delimiter, escapeFormulas)).join(delimiter))
    .join(lineSeparator);
}

/**
 * Exports grid rows to CSV. Pass the TanStack table instance
 * (available as `api.table` from the grid API or via `useDataGridContext`).
 */
export function exportToCsv<TData extends RowData>(
  table: Table<TData>,
  options: CsvExportOptions<TData> = {},
): CsvExportResult {
  const {
    rows: rowScope = 'filtered',
    columns: columnScope = 'visible',
    filename = 'export.csv',
    includeHeaders = true,
    getHeader = getExportHeader,
    getValue = getExportValue,
    delimiter = ',',
    lineSeparator = '\r\n',
    bom = true,
    download = true,
    escapeFormulas = true,
  } = options;

  const columns = resolveExportColumns(table, columnScope);
  const rows = resolveExportRows(table, rowScope);
  const matrix: unknown[][] = [];
  if (includeHeaders) matrix.push(columns.map((c) => getHeader(c)));
  for (const row of rows) matrix.push(columns.map((c) => getValue(row, c)));

  const csv = toCsv(matrix, { delimiter, lineSeparator, escapeFormulas });
  const name = ensureExtension(filename, 'csv');
  if (download) {
    const blob = new Blob([bom ? '﻿' : '', csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, name);
  }
  return { csv, filename: name, rowCount: rows.length };
}

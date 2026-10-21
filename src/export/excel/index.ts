import type { Column, RowData, Table } from '@tanstack/react-table';
import type * as ExcelJSTypes from 'exceljs';
import type { Workbook, Worksheet } from 'exceljs';
import {
  downloadBlob,
  ensureExtension,
  getExportHeader,
  getExportValue,
  resolveExportColumns,
  resolveExportRows,
  type BaseExportOptions,
  type ExportColumnScope,
  type ExportRowScope,
} from '../shared';

export interface ExcelHeaderStyle {
  bold?: boolean;
  /** ARGB or RGB hex, e.g. `'FF228BE6'` or `'#228BE6'`. */
  fillColor?: string;
  fontColor?: string;
}

/** A sheet built from a grid table. */
export interface ExcelTableSheet<TData extends RowData> {
  name: string;
  /** Defaults to the table passed to `exportToExcel`. */
  table?: Table<TData>;
  rows?: ExportRowScope;
  columns?: ExportColumnScope;
}

/** A sheet built from arbitrary data (e.g. a summary sheet). */
export interface ExcelRawSheet {
  name: string;
  columns: ReadonlyArray<{ key: string; header: string; width?: number; numberFormat?: string }>;
  data: ReadonlyArray<Record<string, unknown>>;
}

export type ExcelExportPhase = 'loading' | 'building' | 'writing' | 'done';

export interface ExcelExportOptions<TData extends RowData> extends BaseExportOptions<TData> {
  /** Name of the single sheet (ignored when `sheets` is given). Default `'Sheet1'`. */
  sheetName?: string;
  /** Multiple sheets. When set, replaces the default single sheet. */
  sheets?: ReadonlyArray<ExcelTableSheet<TData> | ExcelRawSheet>;
  headerStyle?: ExcelHeaderStyle;
  /** `grid` (default) derives widths from grid column sizes; `auto` from content length. */
  columnWidths?: 'grid' | 'auto' | Readonly<Record<string, number>>;
  /** Format applied to `Date` cells and `date` filter-variant columns. Default `'yyyy-mm-dd'`. */
  dateFormat?: string;
  /** Freeze the header row. Default `true`. */
  freezeHeader?: boolean;
  /** Add an Excel auto-filter to the header row. Default `false`. */
  autoFilter?: boolean;
  /** Trigger a browser download. Default `true`. */
  download?: boolean;
  creator?: string;
  onProgress?: (state: { phase: ExcelExportPhase; progress: number }) => void;
}

export interface ExcelExportResult {
  blob: Blob;
  filename: string;
  rowCount: number;
}

type ExcelJSModule = typeof ExcelJSTypes;

let excelJsPromise: Promise<ExcelJSModule> | null = null;

/** Lazily loads ExcelJS (an optional peer dependency) the first time it is needed. */
/** @internal */
export function loadExcelJS(): Promise<ExcelJSModule> {
  if (!excelJsPromise) {
    excelJsPromise = import('exceljs')
      .then((mod) => ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule)
      .catch((error: unknown) => {
        excelJsPromise = null;
        throw new Error(
          `Excel export requires the optional peer dependency "exceljs". Install it with \`npm install exceljs\`. (${String(error)})`,
        );
      });
  }
  return excelJsPromise;
}

function toArgb(color: string): string {
  const hex = color.replace('#', '').toUpperCase();
  return hex.length === 6 ? `FF${hex}` : hex;
}

function isRawSheet<TData extends RowData>(sheet: ExcelTableSheet<TData> | ExcelRawSheet): sheet is ExcelRawSheet {
  return 'data' in sheet;
}

/** Excel sheet names: max 31 chars, no `[]:*?/\`, unique. */
export function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  base = candidate;
  return base;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function normalizeCellValue(value: unknown, isDateColumn: boolean): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (isDateColumn && typeof value === 'string') {
    if (ISO_DATE.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    if (ISO_DATE_TIME.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map((v) => (v === null || v === undefined ? '' : String(v))).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function styleHeader(sheet: Worksheet, style: ExcelHeaderStyle, columnCount: number) {
  const header = sheet.getRow(1);
  header.font = { bold: style.bold ?? true, color: style.fontColor ? { argb: toArgb(style.fontColor) } : undefined };
  if (style.fillColor) {
    for (let c = 1; c <= columnCount; c++) {
      header.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(style.fillColor) } };
    }
  }
}

function autoWidth(values: unknown[]): number {
  let max = 8;
  for (const v of values) {
    const len = v instanceof Date ? 12 : v === null || v === undefined ? 0 : String(v).length;
    if (len > max) max = len;
  }
  return Math.min(60, max + 2);
}

function addTableSheet<TData extends RowData>(
  workbook: Workbook,
  name: string,
  table: Table<TData>,
  rowScope: ExportRowScope,
  columnScope: ExportColumnScope,
  options: ExcelExportOptions<TData>,
): number {
  const {
    includeHeaders = true,
    getHeader = getExportHeader,
    getValue = getExportValue,
    columnWidths = 'grid',
    dateFormat = 'yyyy-mm-dd',
    freezeHeader = true,
    autoFilter = false,
    headerStyle = {},
  } = options;
  const columns = resolveExportColumns(table, columnScope);
  const rows = resolveExportRows(table, rowScope);
  const sheet = workbook.addWorksheet(name, {
    views: freezeHeader && includeHeaders ? [{ state: 'frozen', ySplit: 1 }] : undefined,
  });

  const isDate = columns.map((c: Column<TData, unknown>) => c.columnDef.meta?.filterVariant === 'date');
  const matrix = rows.map((row) => columns.map((c, i) => normalizeCellValue(getValue(row, c), isDate[i])));

  if (includeHeaders) sheet.addRow(columns.map((c) => getHeader(c)));
  for (const values of matrix) sheet.addRow(values);

  columns.forEach((column, i) => {
    const sheetColumn = sheet.getColumn(i + 1);
    if (columnWidths === 'grid') sheetColumn.width = Math.max(8, Math.round(column.getSize() / 7));
    else if (columnWidths === 'auto') sheetColumn.width = autoWidth([getHeader(column), ...matrix.map((r) => r[i])]);
    else if (columnWidths[column.id]) sheetColumn.width = columnWidths[column.id];
    const fmt = column.columnDef.meta?.excelNumberFormat ?? (isDate[i] ? dateFormat : undefined);
    if (fmt) sheetColumn.numFmt = fmt;
  });
  // Plain Date values in non-date columns still get a date format.
  matrix.forEach((values, r) =>
    values.forEach((v, c) => {
      if (v instanceof Date && !columns[c].columnDef.meta?.excelNumberFormat && !isDate[c]) {
        sheet.getCell(r + (includeHeaders ? 2 : 1), c + 1).numFmt = dateFormat;
      }
    }),
  );

  if (includeHeaders) {
    styleHeader(sheet, headerStyle, columns.length);
    if (autoFilter && columns.length) {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    }
  }
  return rows.length;
}

function addRawSheet(workbook: Workbook, name: string, spec: ExcelRawSheet, headerStyle: ExcelHeaderStyle) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = spec.columns.map((c) => ({ key: c.key, header: c.header, width: c.width ?? 16, style: c.numberFormat ? { numFmt: c.numberFormat } : {} }));
  for (const row of spec.data) {
    const values: Record<string, unknown> = {};
    for (const c of spec.columns) values[c.key] = normalizeCellValue(row[c.key], false);
    sheet.addRow(values);
  }
  styleHeader(sheet, headerStyle, spec.columns.length);
  return spec.data.length;
}

/**
 * Exports grid rows to an `.xlsx` workbook using ExcelJS (loaded on demand).
 *
 * Only rows present in the client-side table can be exported. For server-side
 * data, fetch the full dataset first or use a dedicated server export endpoint.
 */
export async function exportToExcel<TData extends RowData>(
  table: Table<TData>,
  options: ExcelExportOptions<TData> = {},
): Promise<ExcelExportResult> {
  const { filename = 'export.xlsx', sheetName = 'Sheet1', download = true, onProgress, creator, headerStyle = {} } = options;
  onProgress?.({ phase: 'loading', progress: 0 });
  const ExcelJS = await loadExcelJS();
  onProgress?.({ phase: 'building', progress: 0.2 });

  const workbook = new ExcelJS.Workbook();
  if (creator) workbook.creator = creator;
  workbook.created = new Date();

  const used = new Set<string>();
  const sheets = options.sheets?.length
    ? options.sheets
    : [{ name: sheetName, rows: options.rows ?? 'filtered', columns: options.columns ?? 'visible' } satisfies ExcelTableSheet<TData>];

  let rowCount = 0;
  sheets.forEach((sheet, i) => {
    const name = sanitizeSheetName(sheet.name, used);
    if (isRawSheet(sheet)) rowCount += addRawSheet(workbook, name, sheet, headerStyle);
    else rowCount += addTableSheet(workbook, name, sheet.table ?? table, sheet.rows ?? 'filtered', sheet.columns ?? 'visible', options);
    onProgress?.({ phase: 'building', progress: 0.2 + (0.6 * (i + 1)) / sheets.length });
  });

  onProgress?.({ phase: 'writing', progress: 0.8 });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const name = ensureExtension(filename, 'xlsx');
  if (download) downloadBlob(blob, name);
  onProgress?.({ phase: 'done', progress: 1 });
  return { blob, filename: name, rowCount };
}

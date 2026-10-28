import type { RowData, Table } from '@tanstack/react-table';
import { toCsv } from '../csv';
import { getExportHeader, getExportValue, resolveExportColumns, resolveExportRows, type BaseExportOptions } from '../shared';

export interface ClipboardCopyOptions<TData extends RowData> extends Omit<BaseExportOptions<TData>, 'filename'> {
  /**
   * Prefix cells starting with `=`, `+`, `-`, `@` with a single quote so a
   * spreadsheet does not evaluate them as formulas when pasted. Default `true`.
   */
  escapeFormulas?: boolean;
}

export interface ClipboardCopyResult {
  text: string;
  rowCount: number;
}

/** Builds tab-separated text for the given rows and columns (what `copyToClipboard` writes). */
export function toClipboardText<TData extends RowData>(
  table: Table<TData>,
  options: ClipboardCopyOptions<TData> = {},
): ClipboardCopyResult {
  const {
    rows: rowScope = 'filtered',
    columns: columnScope = 'visible',
    includeHeaders = true,
    getHeader = getExportHeader,
    getValue = getExportValue,
    escapeFormulas = true,
  } = options;
  const columns = resolveExportColumns(table, columnScope);
  const rows = resolveExportRows(table, rowScope);
  const matrix: unknown[][] = [];
  if (includeHeaders) matrix.push(columns.map((c) => getHeader(c)));
  for (const row of rows) matrix.push(columns.map((c) => getValue(row, c)));
  return { text: toCsv(matrix, { delimiter: '\t', lineSeparator: '\n', escapeFormulas }), rowCount: rows.length };
}

async function writeText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for insecure contexts (http://) where the async clipboard API is unavailable.
  if (typeof document === 'undefined') throw new Error('Clipboard is not available');
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand?.('copy') ?? false;
  textarea.remove();
  if (!ok) throw new Error('Clipboard is not available');
}

/**
 * Copies grid rows to the clipboard as tab-separated values, which paste into
 * Excel, Google Sheets and Numbers as separate cells.
 */
export async function copyToClipboard<TData extends RowData>(
  table: Table<TData>,
  options: ClipboardCopyOptions<TData> = {},
): Promise<ClipboardCopyResult> {
  const result = toClipboardText(table, options);
  await writeText(result.text);
  return result;
}

import type { Column, Row, RowData } from '@tanstack/react-table';
import { getByPath, setByPath } from '../../utils/path';
import type { BuiltInEditor } from './editing.types';
import { isInternalColumnId } from '../../export/shared';

export function getAccessorKey<TData extends RowData>(column: Column<TData, unknown>): string | undefined {
  const def = column.columnDef as { accessorKey?: unknown };
  return typeof def.accessorKey === 'string' ? def.accessorKey : undefined;
}

/** Whether the column can be edited at all (independent of the row). */
export function isColumnEditable<TData extends RowData>(column: Column<TData, unknown>): boolean {
  if (isInternalColumnId(column.id) || !column.accessorFn) return false;
  const meta = column.columnDef.meta;
  if (meta?.editable === false) return false;
  return !!(meta?.setValue || getAccessorKey(column));
}

export function isCellEditable<TData extends RowData>(
  row: Row<TData>,
  column: Column<TData, unknown>,
  isRowEditable?: (row: TData) => boolean,
): boolean {
  if (row.getIsGrouped() || !isColumnEditable(column)) return false;
  if (isRowEditable && !isRowEditable(row.original)) return false;
  const editable = column.columnDef.meta?.editable;
  return typeof editable === 'function' ? editable(row.original) : true;
}

/** Writes `value` into a copy of `row` for `column`. */
export function setColumnValue<TData extends RowData>(row: TData, column: Column<TData, unknown>, value: unknown): TData {
  const meta = column.columnDef.meta;
  if (meta?.setValue) return meta.setValue(row, value);
  const key = getAccessorKey(column);
  if (!key) throw new Error(`Column "${column.id}" cannot be edited: provide meta.setValue for accessorFn columns.`);
  return setByPath(row, key, value);
}

export function readColumnValue<TData extends RowData>(row: TData, column: Column<TData, unknown>): unknown {
  const key = getAccessorKey(column);
  if (key) return getByPath(row, key);
  return column.accessorFn ? column.accessorFn(row, 0) : undefined;
}

export function resolveEditorKind<TData extends RowData>(column: Column<TData, unknown>): BuiltInEditor | 'custom' {
  const meta = column.columnDef.meta;
  if (typeof meta?.editor === 'function' || (meta?.editor && typeof meta.editor === 'object')) return 'custom';
  if (typeof meta?.editor === 'string') return meta.editor;
  switch (meta?.filterVariant) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'checkbox';
    case 'select':
      return 'select';
    case 'multiSelect':
      return 'multiSelect';
    default:
      return 'text';
  }
}

export function shallowEqualValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

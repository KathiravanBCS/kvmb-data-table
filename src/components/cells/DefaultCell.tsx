import type { CellContext, RowData } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useDataGridContext } from '../../core/DataGridProvider';

export function formatDisplayValue(value: unknown, trueLabel = 'Yes', falseLabel = 'No'): ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? trueLabel : falseLabel;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toLocaleDateString();
  if (Array.isArray(value)) return value.map((v) => formatDisplayValue(v, trueLabel, falseLabel)).join(', ');
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : String(value);
  if (typeof value === 'object') return null;
  return String(value);
}

/** Default cell renderer: applies `meta.format` or a sensible type-based formatting. */
export function DefaultCell<TData extends RowData>({ getValue, row, column }: CellContext<TData, unknown>) {
  const { labels } = useDataGridContext<TData>();
  const value = getValue();
  const format = column.columnDef.meta?.format;
  if (format) return <>{format(value, row)}</>;
  return <>{formatDisplayValue(value, labels.trueLabel, labels.falseLabel)}</>;
}

/** Default renderer for aggregated values in group rows: `meta.formatAggregate`, then `meta.format`. */
export function DefaultAggregatedCell<TData extends RowData>({ getValue, row, column }: CellContext<TData, unknown>) {
  const { labels } = useDataGridContext<TData>();
  const value = getValue();
  const meta = column.columnDef.meta;
  if (value === undefined || value === null) return null;
  if (meta?.formatAggregate) return <>{meta.formatAggregate(value)}</>;
  if (meta?.format) return <>{meta.format(value, row)}</>;
  return <>{formatDisplayValue(Array.isArray(value) ? value.join(' – ') : value, labels.trueLabel, labels.falseLabel)}</>;
}

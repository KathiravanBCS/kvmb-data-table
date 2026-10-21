import type { CSSProperties, ReactNode } from 'react';
import { flexRender, type Column, type Header, type RowData, type Table } from '@tanstack/react-table';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import { getCellLayoutStyle } from '../../features/pinning/pinning';
import { getColumnAlign } from '../../utils/columns';
import type { DataGridLabels } from '../../core/grid.defaults';
import { formatDisplayValue } from '../cells/DefaultCell';

export interface GridFooterProps<TData extends RowData> {
  table: Table<TData>;
  layout: ColumnLayoutItem[];
  fill: boolean;
  ariaRowIndex: number;
  labels: DataGridLabels;
  className: string;
  cellClassName: string;
  style?: CSSProperties;
  cellStyle?: CSSProperties;
}

/** Computes a column's aggregation over all filtered (pre-pagination) leaf rows. */
export function computeColumnAggregate<TData extends RowData>(table: Table<TData>, column: Column<TData, unknown>): unknown {
  const fn = column.getAggregationFn();
  if (!fn) return undefined;
  const leafRows = table.getFilteredRowModel().flatRows.filter((r) => !r.getIsGrouped() && r.subRows.length === 0);
  return fn(column.id, leafRows, leafRows);
}

function aggregationName<TData extends RowData>(column: Column<TData, unknown>): string | undefined {
  const fn = column.columnDef.aggregationFn;
  return typeof fn === 'string' ? fn : undefined;
}

export function hasFooter<TData extends RowData>(table: Table<TData>): boolean {
  return table.getAllLeafColumns().some((c) => c.columnDef.footer || c.columnDef.meta?.footerAggregation);
}

export function GridFooter<TData extends RowData>({ table, layout, fill, ariaRowIndex, labels, className, cellClassName, style, cellStyle }: GridFooterProps<TData>) {
  const footerGroups = table.getFooterGroups();
  const leafFooters = footerGroups[0]?.headers ?? [];
  const byColumn = new Map<string, Header<TData, unknown>>(leafFooters.map((h) => [h.column.id, h]));
  // Header ids for leaf footers live in the deepest footer group.
  for (const h of footerGroups.flatMap((g) => g.headers)) if (!byColumn.has(h.column.id)) byColumn.set(h.column.id, h);

  return (
    <div role="rowgroup" className="mdg-tfoot">
      <div role="row" aria-rowindex={ariaRowIndex} className={className} style={style}>
        {layout.map((item, colIndex) => {
          const column = table.getColumn(item.id);
          const header = byColumn.get(item.id);
          let content: ReactNode = null;
          if (column && header && column.columnDef.footer) {
            content = flexRender(column.columnDef.footer, header.getContext());
          } else if (column?.columnDef.meta?.footerAggregation) {
            const value = computeColumnAggregate(table, column);
            const format = column.columnDef.meta.formatAggregate;
            const name = aggregationName(column);
            const prefix = name ? labels.aggregateLabels[name] : undefined;
            content = (
              <>
                {prefix && <span className="mdg-aggregate-label">{prefix}: </span>}
                {format ? format(value) : formatDisplayValue(Array.isArray(value) ? value.join(' – ') : value)}
              </>
            );
          }
          return (
            <div
              key={item.id}
              role="gridcell"
              aria-colindex={colIndex + 1}
              className={cellClassName}
              data-align={column ? getColumnAlign(column) : undefined}
              data-pinned={item.pinned || undefined}
              data-pinned-edge={item.edge ? item.pinned : undefined}
              style={{ ...getCellLayoutStyle(item, fill), ...cellStyle }}
            >
              <div className="mdg-cell-content">{content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

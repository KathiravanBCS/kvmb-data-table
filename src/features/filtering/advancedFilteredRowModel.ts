import { createRow, getFilteredRowModel, memo, type Row, type RowData, type RowModel, type Table } from '@tanstack/react-table';
import type { FilterGroup } from './filter.types';
import type { FilterOperatorRegistry } from './filter.operators';
import { evaluateFilterNode, pruneFilterModel } from './filter.model';

export interface AdvancedFilterSource {
  /** Returns the current model; identity changes trigger recomputation. */
  getModel: () => FilterGroup | null;
  getRegistry: () => FilterOperatorRegistry;
}

/**
 * Wraps TanStack's filtered row model (column + global filters) and additionally
 * applies the advanced AND/OR filter model. Parents of matching sub-rows are kept.
 *
 * Plugged in through the `getFilteredRowModel` table option, so grouping, sorting,
 * selection ("select all filtered") and pagination all see the filtered result.
 */
export function getAdvancedFilteredRowModel<TData extends RowData>(
  source: AdvancedFilterSource,
): (table: Table<TData>) => () => RowModel<TData> {
  return (table) => {
    const base = getFilteredRowModel<TData>()(table);
    return memo(
      () => [base(), source.getModel(), source.getRegistry(), table.options.manualFiltering] as const,
      (rowModel, model, registry, manual) => {
        if (manual || !model) return rowModel;
        const pruned = pruneFilterModel(model, registry);
        if (!pruned) return rowModel;

        const matches = (row: Row<TData>) =>
          evaluateFilterNode(pruned, {
            registry,
            original: row.original,
            getValue: (field) => {
              // Unknown fields (e.g. a hidden server-only field) are treated as undefined.
              try {
                return row.getValue(field);
              } catch {
                return undefined;
              }
            },
          });

        const flatRows: Row<TData>[] = [];
        const rowsById: Record<string, Row<TData>> = {};

        const filterRows = (rows: Row<TData>[]): Row<TData>[] => {
          const out: Row<TData>[] = [];
          for (const row of rows) {
            let subRows = row.subRows;
            if (subRows?.length) subRows = filterRows(subRows);
            const keep = matches(row) || (subRows?.length ?? 0) > 0;
            if (!keep) continue;
            if (subRows !== row.subRows) {
              // Clone (like TanStack's own filtering) so the core row keeps its full sub-rows.
              const copy = createRow(table, row.id, row.original, row.index, row.depth, undefined, row.parentId);
              copy.subRows = subRows;
              out.push(copy);
              flatRows.push(copy);
              rowsById[copy.id] = copy;
            } else {
              out.push(row);
              flatRows.push(row);
              rowsById[row.id] = row;
            }
          }
          return out;
        };

        const rows = filterRows(rowModel.rows);
        return { rows, flatRows, rowsById };
      },
      { key: 'getAdvancedFilteredRowModel', debug: () => false },
    );
  };
}

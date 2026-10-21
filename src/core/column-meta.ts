import type { CSSProperties, ReactNode } from 'react';
import type { Cell, Row, RowData } from '@tanstack/react-table';
import type { FilterOption, FilterVariant } from '../features/filtering/filter.types';
import type { BuiltInEditor, CellEditorComponent, CellValidator } from '../features/editing/editing.types';

export type ColumnAlign = 'left' | 'center' | 'right';

/**
 * Data-grid specific column configuration, placed on TanStack's `columnDef.meta`.
 *
 * Standard TanStack options (`enableSorting`, `enableHiding`, `enablePinning`,
 * `enableResizing`, `enableGrouping`, `size`, `minSize`, `maxSize`, `sortingFn`,
 * `aggregationFn`, `aggregatedCell`, `footer`, ...) are used as-is.
 */
export interface DataGridColumnMeta<TData extends RowData, TValue> {
  /** Horizontal alignment of header and cells. Defaults to `right` for number filter variants, otherwise `left`. */
  align?: ColumnAlign;
  /** Filter UI / operator set. Defaults to `text`. Set `enableColumnFilter: false` to disable. */
  filterVariant?: FilterVariant;
  /** Options for `select` / `multiSelect` filters. Derived from data when omitted. */
  filterOptions?: readonly FilterOption[];

  /** Whether the column can be edited (in addition to the grid-level `enableEditing`). Defaults to `true` for accessor columns. */
  editable?: boolean | ((row: TData) => boolean);
  /** Built-in editor name or custom editor component. Defaults to an editor matching `filterVariant`. */
  editor?: BuiltInEditor | CellEditorComponent<TData, TValue>;
  /** Options for `select` / `multiSelect` editors (falls back to `filterOptions`). */
  editorOptions?: readonly FilterOption[];
  /** Sync or async validator for edited values. */
  validate?: CellValidator<TData, TValue>;
  /**
   * Writes an edited value into a row. Required for editable `accessorFn` columns.
   * `accessorKey` columns (including nested `a.b.c` paths) are handled automatically.
   */
  setValue?: (row: TData, value: TValue) => TData;
  /** Parses an editor's raw value before it is stored (e.g. string → number). */
  parseValue?: (value: unknown) => TValue;

  /** Locked columns cannot be hidden or reordered by the user. */
  locked?: boolean;
  /** Overrides the grid's text wrapping for this column. */
  wrap?: boolean;

  /** Extra class names / styles for body cells. */
  cellClassName?: string | ((cell: Cell<TData, TValue>) => string | undefined);
  cellStyle?: CSSProperties | ((cell: Cell<TData, TValue>) => CSSProperties | undefined);
  headerClassName?: string;

  /** Formats values for display when no `cell` renderer is supplied. */
  format?: (value: TValue, row: Row<TData>) => ReactNode;

  /** Show the column's `aggregationFn` result in the footer row. */
  footerAggregation?: boolean;
  /** Formats the aggregated footer value. */
  formatAggregate?: (value: unknown) => ReactNode;

  /** Export: value written to CSV/Excel. Defaults to the cell value. */
  exportValue?: (row: TData, value: TValue) => unknown;
  /** Export: header text. Defaults to the header string or column id. */
  exportHeader?: string;
  /** Export: exclude this column from exports. */
  exportable?: boolean;
  /** Export: Excel number format, e.g. `'#,##0.00'` or `'yyyy-mm-dd'`. */
  excelNumberFormat?: string;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- type parameters must match TanStack's declaration
  interface ColumnMeta<TData extends RowData, TValue> extends DataGridColumnMeta<TData, TValue> {}
}

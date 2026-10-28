import type { CSSProperties, MouseEvent, ReactNode, Ref } from 'react';
import type {
  ColumnDef,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  Table,
  TableOptions,
  VisibilityState,
} from '@tanstack/react-table';
import type { FilterGroup, FilterOperatorDefinition, FilterPreset } from '../features/filtering/filter.types';
import type { EditMode, EditTrigger, RowUpdateHandler, RowValidator } from '../features/editing/editing.types';
import type { PersistStateOptions } from '../features/persistence/persistence';
import type { DataGridLabels } from './grid.defaults';
import type { CsvExportOptions, CsvExportResult } from '../export/csv';
import type { ExcelExportOptions, ExcelExportResult } from '../export/excel';
import type { ClipboardCopyOptions, ClipboardCopyResult } from '../export/clipboard';

export type GridDensity = 'compact' | 'standard' | 'comfortable';

/** Selector names for `classNames` / `styles` (Mantine Styles API). */
export type DataGridStylesNames =
  | 'root'
  | 'toolbar'
  | 'scrollArea'
  | 'table'
  | 'header'
  | 'headerRow'
  | 'headerCell'
  | 'body'
  | 'row'
  | 'cell'
  | 'groupRow'
  | 'footer'
  | 'footerCell'
  | 'pagination'
  | 'emptyState'
  | 'errorState';

/** Server-relevant state, emitted by `onQueryChange` for manual (server-side) mode. */
export interface DataGridQuery {
  pagination: PaginationState;
  sorting: SortingState;
  filterModel: FilterGroup;
  globalFilter: string;
}

/** Snapshot of the user-adjustable column layout. */
export interface ColumnLayout {
  order: ColumnOrderState;
  visibility: VisibilityState;
  sizing: ColumnSizingState;
  pinning: ColumnPinningState;
}

export interface RowReorderEvent<TData> {
  rowId: string;
  fromIndex: number;
  toIndex: number;
  /** A copy of `data` with the row moved (only meaningful for flat, unsorted, unfiltered data). */
  reorderedData: TData[];
}

export interface BulkActionsContext<TData extends RowData> {
  selectedRows: Row<TData>[];
  table: Table<TData>;
  clearSelection: () => void;
}

export interface GroupHeaderContext<TData extends RowData> {
  row: Row<TData>;
  columnId: string;
  value: unknown;
  /** Number of leaf rows in the group. */
  count: number;
}

export interface DetailPanelContext<TData extends RowData> {
  row: Row<TData>;
  table: Table<TData>;
}

export interface EmptyStateContext {
  /** True when rows exist but none pass the filters. */
  filtered: boolean;
}

/** Imperative API exposed through `apiRef`. */
export interface DataGridApi<TData extends RowData> {
  /** Underlying TanStack table instance. */
  table: Table<TData>;
  getSelectedRows: () => Row<TData>[];
  clearSelection: () => void;
  /** Selects all rows passing the current filters (client-side rows only). */
  selectAllFiltered: () => void;
  getFilterModel: () => FilterGroup;
  setFilterModel: (model: FilterGroup) => void;
  clearFilters: () => void;
  setGlobalFilter: (value: string) => void;
  resetSorting: () => void;
  getColumnLayout: () => ColumnLayout;
  setColumnLayout: (layout: Partial<ColumnLayout>) => void;
  resetColumnLayout: () => void;
  /** Starts editing a row (row mode) or a cell (cell mode; first editable column when omitted). */
  startEditing: (rowId: string, columnId?: string) => void;
  /** Commits the active edit. Resolves `true` when saved, `false` on validation or save failure. */
  commitEditing: () => Promise<boolean>;
  cancelEditing: () => void;
  /** Scrolls a row (index in the current row model) into view. */
  scrollToRow: (index: number) => void;
  focusCell: (rowIndex: number, columnId: string) => void;
  exportCsv: (options?: CsvExportOptions<TData>) => CsvExportResult;
  exportExcel: (options?: ExcelExportOptions<TData>) => Promise<ExcelExportResult>;
  /** Copies rows as tab-separated text (pastes into Excel / Google Sheets as cells). */
  copyToClipboard: (options?: ClipboardCopyOptions<TData>) => Promise<ClipboardCopyResult>;
  /** Expands every group, tree node and detail panel. */
  expandAll: () => void;
  collapseAll: () => void;
}

/** Feature toggles accepted as top-level boolean props. */
export interface DataGridFeatureProps {
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  /** Per-column filters (header menu) and the advanced filter builder. */
  enableFiltering?: boolean;
  /** Global search input in the toolbar. Defaults to `enableFiltering`. */
  enableGlobalFilter?: boolean;
  enableFilterBuilder?: boolean;
  enablePagination?: boolean;
  enableColumnResizing?: boolean;
  enableColumnOrdering?: boolean;
  enableColumnPinning?: boolean;
  enableHiding?: boolean;
  enableGrouping?: boolean;
  enableEditing?: boolean;
  enableVirtualization?: boolean;
  enableRowDragging?: boolean;
  enableExport?: boolean;
  enableDensityToggle?: boolean;
  enableToolbar?: boolean;
  enableKeyboardNavigation?: boolean;
}

export interface DataGridProps<TData extends RowData> extends DataGridFeatureProps {
  data: TData[];
  columns: ColumnDef<TData, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any -- matches TanStack's own `columns` option; value types differ per column
  /**
   * Stable row id. Strongly recommended (required for reliable selection,
   * editing and server-side data). Defaults to `row.id` when present, else the index.
   */
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
  /** Sub rows for tree data / server-provided groups. */
  getSubRows?: (row: TData, index: number) => TData[] | undefined;
  /**
   * Column that shows the tree expander and indentation for `getSubRows` data.
   * Defaults to the first visible data column.
   */
  treeColumnId?: string;

  /* ---------- Layout ---------- */
  /** Fixed height of the scroll area. Required for virtualization. */
  height?: number | string;
  maxHeight?: number | string;
  density?: GridDensity;
  defaultDensity?: GridDensity;
  onDensityChange?: (density: GridDensity) => void;
  /** Row height in px for fixed-height rows (defaults depend on density). */
  rowHeight?: number;
  /** Measure each row's real height (for wrapping text / variable content). */
  dynamicRowHeight?: boolean;
  /** Wrap cell text instead of truncating with an ellipsis. */
  wrapText?: boolean;
  striped?: boolean;
  withColumnBorders?: boolean;
  withRowBorders?: boolean;
  withBorder?: boolean;
  highlightOnHover?: boolean;
  /** `fill` stretches unpinned columns to the available width; `fixed` uses exact sizes. */
  layoutMode?: 'fill' | 'fixed';
  stickyHeader?: boolean;
  /** Show the footer row (column `footer` renderers and `meta.footerAggregation`). */
  showFooter?: boolean;

  /* ---------- Status ---------- */
  loading?: boolean;
  /** Show skeleton rows instead of an overlay while loading with no data. Default `true`. */
  skeletonRows?: number;
  error?: ReactNode | Error | null;
  onRetry?: () => void;
  renderEmpty?: (ctx: EmptyStateContext) => ReactNode;
  renderError?: (error: ReactNode | Error) => ReactNode;

  /* ---------- Sorting ---------- */
  sorting?: SortingState;
  defaultSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;

  /* ---------- Filtering ---------- */
  filterModel?: FilterGroup;
  defaultFilterModel?: FilterGroup;
  onFilterModelChange?: (model: FilterGroup) => void;
  globalFilter?: string;
  defaultGlobalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  /** Debounce (ms) between typing in the search box and applying the global filter. Default 250. */
  globalFilterDebounce?: number;
  manualFiltering?: boolean;
  /** Custom filter operators (merged with / overriding built-ins by `operator`). */
  filterOperators?: readonly FilterOperatorDefinition[];
  filterPresets?: FilterPreset[];
  defaultFilterPresets?: FilterPreset[];
  onFilterPresetsChange?: (presets: FilterPreset[]) => void;

  /* ---------- Pagination ---------- */
  pagination?: PaginationState;
  defaultPagination?: Partial<PaginationState>;
  onPaginationChange?: (pagination: PaginationState) => void;
  manualPagination?: boolean;
  /** Total rows on the server (manual pagination). */
  rowCount?: number;
  pageSizeOptions?: number[];

  /* ---------- Selection ---------- */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  selectionMode?: 'single' | 'multiple';
  rowSelection?: RowSelectionState;
  defaultRowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** Toggle selection when a row is clicked (in addition to the checkbox). */
  selectOnRowClick?: boolean;
  renderBulkActions?: (ctx: BulkActionsContext<TData>) => ReactNode;

  /* ---------- Columns ---------- */
  columnVisibility?: VisibilityState;
  defaultColumnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  columnOrder?: ColumnOrderState;
  defaultColumnOrder?: ColumnOrderState;
  onColumnOrderChange?: (state: ColumnOrderState) => void;
  columnSizing?: ColumnSizingState;
  defaultColumnSizing?: ColumnSizingState;
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  columnPinning?: ColumnPinningState;
  defaultColumnPinning?: ColumnPinningState;
  onColumnPinningChange?: (state: ColumnPinningState) => void;
  /** Default column options merged into every column definition. */
  defaultColumn?: Partial<ColumnDef<TData, unknown>>;

  /* ---------- Grouping ---------- */
  grouping?: GroupingState;
  defaultGrouping?: GroupingState;
  onGroupingChange?: (grouping: GroupingState) => void;
  expanded?: ExpandedState;
  defaultExpanded?: ExpandedState;
  onExpandedChange?: (expanded: ExpandedState) => void;
  /** Data is already grouped by the server (use with `getSubRows`). */
  manualGrouping?: boolean;
  renderGroupHeader?: (ctx: GroupHeaderContext<TData>) => ReactNode;

  /* ---------- Master / detail ---------- */
  /**
   * Content shown in a full-width panel below an expanded row. Adds an expand
   * column on the left. Rows with sub rows expand to their children instead.
   */
  renderDetailPanel?: (ctx: DetailPanelContext<TData>) => ReactNode;
  /** Which rows can expand. Defaults to every row with `renderDetailPanel`, else rows with sub rows. */
  getRowCanExpand?: (row: Row<TData>) => boolean;

  /* ---------- Editing ---------- */
  editMode?: EditMode;
  editTrigger?: EditTrigger;
  /** Whether a row may be edited at all. */
  isRowEditable?: (row: TData) => boolean;
  onRowUpdate?: RowUpdateHandler<TData>;
  validateRow?: RowValidator<TData>;
  /** Show edited values immediately and roll back if `onRowUpdate` fails. Default `true`. */
  optimisticUpdates?: boolean;
  onEditError?: (error: unknown, row: TData) => void;

  /* ---------- Drag & drop ---------- */
  onRowReorder?: (event: RowReorderEvent<TData>) => void;
  canDragRow?: (row: Row<TData>) => boolean;

  /* ---------- Virtualization ---------- */
  overscan?: number;

  /* ---------- Server-side ---------- */
  /** Fired (after the debounce) whenever pagination, sorting, filters or search change. */
  onQueryChange?: (query: DataGridQuery) => void;

  /* ---------- Persistence ---------- */
  persistState?: PersistStateOptions;

  /* ---------- Customisation ---------- */
  renderToolbar?: (table: Table<TData>) => ReactNode;
  /** Extra toolbar content rendered on the right side. */
  toolbarActions?: ReactNode;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getRowStyle?: (row: Row<TData>) => CSSProperties | undefined;
  onRowClick?: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => void;
  onRowDoubleClick?: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => void;
  labels?: Partial<DataGridLabels>;
  /** Accessible name of the grid. */
  /** Called when a toolbar export fails (e.g. `exceljs` is not installed). */
  onExportError?: (error: unknown) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  style?: CSSProperties;
  classNames?: Partial<Record<DataGridStylesNames, string>>;
  styles?: Partial<Record<DataGridStylesNames, CSSProperties>>;
  apiRef?: Ref<DataGridApi<TData> | null>;
  /** Escape hatch: extra TanStack table options (merged last, use with care). */
  tableOptions?: Partial<Omit<TableOptions<TData>, 'data' | 'columns' | 'state'>>;
}

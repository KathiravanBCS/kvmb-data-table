import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  type FilterFn,
  type GroupingState,
  type PaginationState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table';
import { useControllableState, resolveUpdater } from '../hooks/useControllableState';
import { useLatestRef } from '../hooks/useLatestRef';
import type { ColumnLayout, DataGridApi, DataGridProps, DataGridQuery, GridDensity } from './grid.types';
import { defaultLabels, type DataGridLabels } from './grid.defaults';
import {
  ACTIONS_COLUMN_ID,
  DEFAULT_GLOBAL_FILTER_DEBOUNCE,
  DEFAULT_OVERSCAN,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_ROW_HEIGHT,
  DRAG_COLUMN_ID,
  SELECT_COLUMN_ID,
} from './grid.constants';
import type { FilterGroup, FilterPreset } from '../features/filtering/filter.types';
import { createOperatorRegistry, type FilterOperatorRegistry } from '../features/filtering/filter.operators';
import { EMPTY_FILTER_MODEL, getActiveConditions } from '../features/filtering/filter.model';
import { getAdvancedFilteredRowModel } from '../features/filtering/advancedFilteredRowModel';
import { useGridEditing, type GridEditing } from '../features/editing/useGridEditing';
import { loadPersistedState, savePersistedState, type PersistedGridState } from '../features/persistence/persistence';
import { exportToCsv } from '../export/csv';
import type { ExcelExportOptions } from '../export/excel';
import { createSelectColumn } from '../features/selection/selectColumn';
import { createDragColumn } from '../features/drag-drop/dragColumn';
import { createActionsColumn } from '../features/editing/actionsColumn';
import { DefaultCell } from '../components/cells/DefaultCell';
import { isInternalColumnId } from '../export/shared';

const INTERNAL_LEFT = [DRAG_COLUMN_ID, SELECT_COLUMN_ID];
const INTERNAL_RIGHT = [ACTIONS_COLUMN_ID];

function defaultGetRowId<TData>(row: TData, index: number, parent?: Row<TData>): string {
  const id = (row as { id?: unknown } | null)?.id;
  if (typeof id === 'string' || typeof id === 'number') return String(id);
  return parent ? `${parent.id}.${index}` : String(index);
}

function stringifyForSearch(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringifyForSearch).join(' ');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return '';
  return String(value);
}

const globalSearchFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  const search = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!search) return true;
  return stringifyForSearch(row.getValue(columnId)).toLowerCase().includes(search);
};
globalSearchFilterFn.autoRemove = (value) => !value;

export interface DataGridContextValue<TData extends RowData> {
  table: Table<TData>;
  props: DataGridProps<TData>;
  labels: DataGridLabels;
  density: GridDensity;
  setDensity: (density: GridDensity) => void;
  rowHeight: number;
  overscan: number;
  features: Required<{
    sorting: boolean;
    filtering: boolean;
    globalFilter: boolean;
    filterBuilder: boolean;
    pagination: boolean;
    resizing: boolean;
    ordering: boolean;
    pinning: boolean;
    hiding: boolean;
    grouping: boolean;
    editing: boolean;
    virtualization: boolean;
    rowDragging: boolean;
    export: boolean;
    densityToggle: boolean;
    toolbar: boolean;
    keyboardNavigation: boolean;
    selection: boolean;
  }>;
  pageSizeOptions: number[];
  globalFilterDebounce: number;
  filterModel: FilterGroup;
  setFilterModel: (updater: Updater<FilterGroup>) => void;
  activeFilterCount: number;
  registry: FilterOperatorRegistry;
  presets: FilterPreset[];
  setPresets: (updater: Updater<FilterPreset[]>) => void;
  editing: GridEditing<TData>;
  announce: (message: string) => void;
  announcement: string;
  api: DataGridApi<TData>;
  /** Set by the body once the scroll container / virtualizer exist. */
  scrollToIndexRef: { current: ((index: number) => void) | null };
  focusCellRef: { current: ((rowIndex: number, colIndex: number) => void) | null };
  /** Ids of internal (non-data) columns. */
  isInternalColumn: (id: string) => boolean;
  rowDragDisabled: boolean;
}

export function useDataGrid<TData extends RowData>(props: DataGridProps<TData>): DataGridContextValue<TData> {
  const labels = useMemo(() => ({ ...defaultLabels, ...props.labels }), [props.labels]);

  // ---------------------------------------------------------------- persistence
  const persisted = useState<PersistedGridState>(() => loadPersistedState(props.persistState))[0];

  // ---------------------------------------------------------------- feature flags
  const selectionEnabled = props.enableRowSelection !== undefined && props.enableRowSelection !== false;
  const filtering = props.enableFiltering ?? false;
  const features: DataGridContextValue<TData>['features'] = {
    sorting: props.enableSorting ?? true,
    filtering,
    globalFilter: props.enableGlobalFilter ?? filtering,
    filterBuilder: props.enableFilterBuilder ?? filtering,
    pagination: props.enablePagination ?? false,
    resizing: props.enableColumnResizing ?? false,
    ordering: props.enableColumnOrdering ?? false,
    pinning: props.enableColumnPinning ?? false,
    hiding: props.enableHiding ?? true,
    grouping: props.enableGrouping ?? false,
    editing: props.enableEditing ?? false,
    virtualization: props.enableVirtualization ?? false,
    rowDragging: props.enableRowDragging ?? false,
    export: props.enableExport ?? false,
    densityToggle: props.enableDensityToggle ?? true,
    toolbar: false,
    keyboardNavigation: props.enableKeyboardNavigation ?? true,
    selection: selectionEnabled,
  };
  features.toolbar =
    props.enableToolbar ??
    (features.globalFilter ||
      features.filterBuilder ||
      features.hiding ||
      features.export ||
      features.grouping ||
      !!props.toolbarActions ||
      !!props.renderToolbar);

  // ---------------------------------------------------------------- state
  const [density, setDensity] = useControllableState<GridDensity>(
    props.density,
    props.onDensityChange,
    () => persisted.density ?? props.defaultDensity ?? 'standard',
  );

  const [sorting, setSortingRaw] = useControllableState<SortingState>(
    props.sorting,
    props.onSortingChange,
    () => persisted.sorting ?? props.defaultSorting ?? [],
  );
  const [filterModel, setFilterModelRaw] = useControllableState<FilterGroup>(
    props.filterModel,
    props.onFilterModelChange,
    () => persisted.filterModel ?? props.defaultFilterModel ?? EMPTY_FILTER_MODEL,
  );
  const [globalFilter, setGlobalFilterRaw] = useControllableState<string>(
    props.globalFilter,
    props.onGlobalFilterChange,
    () => persisted.globalFilter ?? props.defaultGlobalFilter ?? '',
  );
  const [presets, setPresets] = useControllableState<FilterPreset[]>(
    props.filterPresets,
    props.onFilterPresetsChange,
    () => persisted.filterPresets ?? props.defaultFilterPresets ?? [],
  );
  const [pagination, setPaginationRaw] = useControllableState<PaginationState>(props.pagination, props.onPaginationChange, () => ({
    pageIndex: persisted.pagination?.pageIndex ?? props.defaultPagination?.pageIndex ?? 0,
    pageSize: persisted.pagination?.pageSize ?? props.defaultPagination?.pageSize ?? props.pageSizeOptions?.[0] ?? DEFAULT_PAGE_SIZE,
  }));
  const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>(
    props.rowSelection,
    props.onRowSelectionChange,
    () => props.defaultRowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] = useControllableState<VisibilityState>(
    props.columnVisibility,
    props.onColumnVisibilityChange,
    () => persisted.columnVisibility ?? props.defaultColumnVisibility ?? {},
  );
  const [columnOrder, setColumnOrder] = useControllableState<ColumnOrderState>(
    props.columnOrder,
    props.onColumnOrderChange,
    () => persisted.columnOrder ?? props.defaultColumnOrder ?? [],
  );
  const [columnSizing, setColumnSizing] = useControllableState<ColumnSizingState>(
    props.columnSizing,
    props.onColumnSizingChange,
    () => persisted.columnSizing ?? props.defaultColumnSizing ?? {},
  );
  const [columnPinning, setColumnPinningRaw] = useControllableState<ColumnPinningState>(
    props.columnPinning,
    props.onColumnPinningChange,
    () => persisted.columnPinning ?? props.defaultColumnPinning ?? {},
  );
  const [grouping, setGroupingRaw] = useControllableState<GroupingState>(
    props.grouping,
    props.onGroupingChange,
    () => persisted.grouping ?? props.defaultGrouping ?? [],
  );
  const [expanded, setExpanded] = useControllableState<ExpandedState>(
    props.expanded,
    props.onExpandedChange,
    () => props.defaultExpanded ?? {},
  );

  // Changing what is shown resets to the first page (client and server side).
  const resetPageIndex = useCallback(() => {
    setPaginationRaw((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [setPaginationRaw]);

  const setSorting = useCallback(
    (updater: Updater<SortingState>) => {
      setSortingRaw(updater);
      resetPageIndex();
    },
    [setSortingRaw, resetPageIndex],
  );
  const setFilterModel = useCallback(
    (updater: Updater<FilterGroup>) => {
      setFilterModelRaw(updater);
      resetPageIndex();
    },
    [setFilterModelRaw, resetPageIndex],
  );
  const setGlobalFilter = useCallback(
    (updater: Updater<string>) => {
      setGlobalFilterRaw((prev) => resolveUpdater(updater, prev) ?? '');
      resetPageIndex();
    },
    [setGlobalFilterRaw, resetPageIndex],
  );
  const setGrouping = useCallback(
    (updater: Updater<GroupingState>) => {
      setGroupingRaw(updater);
      resetPageIndex();
    },
    [setGroupingRaw, resetPageIndex],
  );

  // Internal columns are always pinned (left: drag/select, right: actions) but are
  // kept out of the user-facing pinning state.
  const effectivePinning = useMemo<ColumnPinningState>(
    () => ({
      left: [...INTERNAL_LEFT, ...(columnPinning.left ?? []).filter((id) => !isInternalColumnId(id))],
      right: [...(columnPinning.right ?? []).filter((id) => !isInternalColumnId(id)), ...INTERNAL_RIGHT],
    }),
    [columnPinning],
  );
  const setColumnPinning = useCallback(
    (updater: Updater<ColumnPinningState>) => {
      setColumnPinningRaw((prev) => {
        const next = resolveUpdater(updater, {
          left: [...INTERNAL_LEFT, ...(prev.left ?? [])],
          right: [...(prev.right ?? []), ...INTERNAL_RIGHT],
        });
        return {
          left: (next.left ?? []).filter((id) => !isInternalColumnId(id)),
          right: (next.right ?? []).filter((id) => !isInternalColumnId(id)),
        };
      });
    },
    [setColumnPinningRaw],
  );

  // ---------------------------------------------------------------- filtering
  const registry = useMemo(() => createOperatorRegistry(props.filterOperators), [props.filterOperators]);
  const activeFilterCount = useMemo(() => getActiveConditions(filterModel, registry).length, [filterModel, registry]);
  const filterSource = useLatestRef({ model: filterModel, registry });
  const [filteredRowModelFactory] = useState(() =>
    getAdvancedFilteredRowModel<TData>({
      getModel: () => filterSource.current.model,
      getRegistry: () => filterSource.current.registry,
    }),
  );

  // ---------------------------------------------------------------- editing
  const tableRef = useRef<Table<TData> | null>(null);
  const getRowId = props.getRowId ?? defaultGetRowId;
  const editing = useGridEditing<TData>({
    enabled: features.editing,
    mode: props.editMode ?? 'cell',
    getTable: () => tableRef.current,
    data: props.data,
    isRowEditable: props.isRowEditable,
    onRowUpdate: props.onRowUpdate,
    validateRow: props.validateRow,
    optimistic: props.optimisticUpdates ?? true,
    onEditError: props.onEditError,
    saveFailedLabel: labels.saveFailed,
  });

  const data = useMemo(() => {
    const ids = Object.keys(editing.overrides);
    if (ids.length === 0) return props.data;
    return props.data.map((row, index) => editing.overrides[getRowId(row, index)] ?? row);
    // getRowId is intentionally excluded: it is commonly an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data, editing.overrides]);

  // ---------------------------------------------------------------- columns
  const rowDragDisabled = sorting.length > 0 || grouping.length > 0;
  const columns = useMemo(() => {
    const cols: ColumnDef<TData, unknown>[] = [];
    if (features.rowDragging) cols.push(createDragColumn<TData>());
    if (selectionEnabled) cols.push(createSelectColumn<TData>(props.selectionMode ?? 'multiple'));
    cols.push(...(props.columns as ColumnDef<TData, unknown>[]));
    if (features.editing && props.editMode === 'row') cols.push(createActionsColumn<TData>());
    return cols;
  }, [features.rowDragging, selectionEnabled, props.selectionMode, props.columns, features.editing, props.editMode]);

  const defaultColumn = useMemo<Partial<ColumnDef<TData, unknown>>>(
    () => ({ minSize: 48, size: 160, maxSize: 2000, cell: DefaultCell, ...props.defaultColumn }),
    [props.defaultColumn],
  );

  const enableRowSelectionOption = props.enableRowSelection;
  const table = useReactTable<TData>({
    data,
    columns,
    defaultColumn,
    getRowId,
    getSubRows: props.getSubRows,
    state: {
      sorting,
      globalFilter,
      pagination,
      rowSelection,
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning: effectivePinning,
      grouping,
      expanded,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPaginationRaw,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: filteredRowModelFactory,
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: features.pagination ? getPaginationRowModel() : undefined,
    globalFilterFn: globalSearchFilterFn as FilterFn<TData>,
    getColumnCanGlobalFilter: (column) => !!column.accessorFn && !isInternalColumnId(column.id),
    enableSorting: features.sorting,
    enableMultiSort: props.enableMultiSort ?? true,
    // Always start with ascending (TanStack defaults to descending for numbers); override per column.
    sortDescFirst: false,
    isMultiSortEvent: (e) => (e as KeyboardEvent).shiftKey || (e as KeyboardEvent).metaKey || (e as KeyboardEvent).ctrlKey,
    enableColumnFilters: features.filtering,
    // The search UI is optional (`enableGlobalFilter`), but a provided global filter always applies.
    enableGlobalFilter: true,
    enableColumnResizing: features.resizing,
    columnResizeMode: 'onChange',
    enablePinning: features.pinning,
    enableHiding: features.hiding,
    enableGrouping: features.grouping,
    enableRowSelection: typeof enableRowSelectionOption === 'function' ? enableRowSelectionOption : selectionEnabled,
    enableMultiRowSelection: (props.selectionMode ?? 'multiple') === 'multiple',
    enableSubRowSelection: (props.selectionMode ?? 'multiple') === 'multiple',
    enableExpanding: true,
    groupedColumnMode: 'reorder',
    manualSorting: props.manualSorting,
    manualFiltering: props.manualFiltering,
    manualPagination: props.manualPagination,
    manualGrouping: props.manualGrouping,
    rowCount: props.manualPagination ? props.rowCount : undefined,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    paginateExpandedRows: true,
    ...props.tableOptions,
  });
  tableRef.current = table;

  // Clamp the page index when the data shrinks below the current page (client-side).
  const pageCount = features.pagination ? table.getPageCount() : 1;
  useEffect(() => {
    if (!features.pagination || props.manualPagination) return;
    if (pageCount > 0 && pagination.pageIndex >= pageCount) {
      setPaginationRaw((prev) => ({ ...prev, pageIndex: Math.max(0, pageCount - 1) }));
    }
  }, [features.pagination, props.manualPagination, pageCount, pagination.pageIndex, setPaginationRaw]);

  // ---------------------------------------------------------------- announcements
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((message: string) => {
    // Clearing first makes screen readers re-read identical consecutive messages.
    setAnnouncement('');
    setTimeout(() => setAnnouncement(message), 50);
  }, []);

  // ---------------------------------------------------------------- server query
  const onQueryChangeRef = useLatestRef(props.onQueryChange);
  const query = useMemo<DataGridQuery>(
    () => ({ pagination, sorting, filterModel, globalFilter }),
    [pagination, sorting, filterModel, globalFilter],
  );
  useEffect(() => {
    onQueryChangeRef.current?.(query);
  }, [query, onQueryChangeRef]);

  // ---------------------------------------------------------------- persistence (save)
  const persistOptions = props.persistState;
  const persistKey = persistOptions?.key;
  const persistOptionsRef = useLatestRef(persistOptions);
  useEffect(() => {
    const opts = persistOptionsRef.current;
    if (!opts) return;
    const handle = setTimeout(() => {
      savePersistedState(opts, {
        sorting,
        filterModel,
        globalFilter,
        filterPresets: presets,
        pagination,
        columnVisibility,
        columnOrder,
        columnSizing,
        columnPinning,
        grouping,
        density,
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [
    persistKey,
    persistOptionsRef,
    sorting,
    filterModel,
    globalFilter,
    presets,
    pagination,
    columnVisibility,
    columnOrder,
    columnSizing,
    columnPinning,
    grouping,
    density,
  ]);

  // ---------------------------------------------------------------- api
  const scrollToIndexRef = useRef<((index: number) => void) | null>(null);
  const focusCellRef = useRef<((rowIndex: number, colIndex: number) => void) | null>(null);
  const initialLayoutRef = useRef<ColumnLayout>({
    order: props.defaultColumnOrder ?? [],
    visibility: props.defaultColumnVisibility ?? {},
    sizing: props.defaultColumnSizing ?? {},
    pinning: props.defaultColumnPinning ?? {},
  });
  const latest = useLatestRef({ table, filterModel, columnOrder, columnVisibility, columnSizing, columnPinning, editing });

  const api = useMemo<DataGridApi<TData>>(() => {
    const t = () => latest.current.table;
    return {
      get table() {
        return t();
      },
      getSelectedRows: () => {
        const selection = t().getState().rowSelection;
        return t()
          .getCoreRowModel()
          .flatRows.filter((r) => selection[r.id]);
      },
      clearSelection: () => t().resetRowSelection(true),
      selectAllFiltered: () => t().toggleAllRowsSelected(true),
      getFilterModel: () => latest.current.filterModel,
      setFilterModel: (model) => setFilterModel(model),
      clearFilters: () => {
        setFilterModel(EMPTY_FILTER_MODEL);
        setGlobalFilter('');
      },
      setGlobalFilter: (value) => setGlobalFilter(value),
      resetSorting: () => setSorting([]),
      getColumnLayout: () => ({
        order: latest.current.columnOrder,
        visibility: latest.current.columnVisibility,
        sizing: latest.current.columnSizing,
        pinning: latest.current.columnPinning,
      }),
      setColumnLayout: (layout) => {
        if (layout.order) setColumnOrder(layout.order);
        if (layout.visibility) setColumnVisibility(layout.visibility);
        if (layout.sizing) setColumnSizing(layout.sizing);
        if (layout.pinning) setColumnPinningRaw(layout.pinning);
      },
      resetColumnLayout: () => {
        const initial = initialLayoutRef.current;
        setColumnOrder(initial.order);
        setColumnVisibility(initial.visibility);
        setColumnSizing(initial.sizing);
        setColumnPinningRaw(initial.pinning);
      },
      startEditing: (rowId, columnId) => latest.current.editing.startEditing(rowId, columnId),
      commitEditing: () => latest.current.editing.commit(),
      cancelEditing: () => latest.current.editing.cancel(),
      scrollToRow: (index) => scrollToIndexRef.current?.(index),
      focusCell: (rowIndex, columnId) => {
        const colIndex = t()
          .getVisibleLeafColumns()
          .findIndex((c) => c.id === columnId);
        if (colIndex >= 0) focusCellRef.current?.(rowIndex, colIndex);
      },
      exportCsv: (options) => exportToCsv(t(), options),
      exportExcel: async (options?: ExcelExportOptions<TData>) => {
        const mod = await import('../export/excel');
        return mod.exportToExcel(t(), options);
      },
    };
  }, [latest, setFilterModel, setGlobalFilter, setSorting, setColumnOrder, setColumnVisibility, setColumnSizing, setColumnPinningRaw]);

  useImperativeHandle(props.apiRef, () => api, [api]);

  const rowHeight = props.rowHeight ?? DEFAULT_ROW_HEIGHT[density];

  // A stable context object, refreshed every render. Components that are memoised
  // (rows/cells) receive the values that affect them as props.
  const contextRef = useRef<DataGridContextValue<TData> | null>(null);
  const value: DataGridContextValue<TData> = {
    table,
    props,
    labels,
    density,
    setDensity,
    rowHeight,
    overscan: props.overscan ?? DEFAULT_OVERSCAN,
    features,
    pageSizeOptions: props.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
    globalFilterDebounce: props.globalFilterDebounce ?? DEFAULT_GLOBAL_FILTER_DEBOUNCE,
    filterModel,
    setFilterModel,
    activeFilterCount,
    registry,
    presets,
    setPresets,
    editing,
    announce,
    announcement,
    api,
    scrollToIndexRef,
    focusCellRef,
    isInternalColumn: isInternalColumnId,
    rowDragDisabled,
  };
  if (!contextRef.current) contextRef.current = value;
  else Object.assign(contextRef.current, value);
  return contextRef.current;
}

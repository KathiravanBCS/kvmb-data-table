import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type MouseEvent } from 'react';
import { LoadingOverlay, useProps, useStyles, type Factory } from '@mantine/core';
import type { Row, RowData } from '@tanstack/react-table';
import { useDataGrid } from './useDataGrid';
import { DataGridProvider } from './DataGridProvider';
import type { DataGridProps, DataGridStylesNames } from './grid.types';
import { DataGridToolbar } from '../components/toolbar/Toolbar';
import { GridHeader } from '../components/header/GridHeader';
import { GridBody } from '../components/body/GridBody';
import { GridFooter, hasFooter } from '../components/footer/GridFooter';
import { GridPagination } from '../components/pagination/GridPagination';
import { EmptyState, ErrorState, SkeletonRows } from '../components/overlays/GridStates';
import { computeColumnLayout } from '../features/pinning/pinning';
import { useGridNavigation } from '../features/keyboard/useGridNavigation';
import { GridDndProvider } from '../features/drag-drop/GridDndProvider';
import type { RowHandlers } from '../components/rows/GridRow';
import { useLatestRef } from '../hooks/useLatestRef';
import type { GridEditing } from '../features/editing/useGridEditing';

export type DataGridFactory = Factory<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mantine factory payload is shared by every row type
  props: DataGridProps<any>;
  stylesNames: DataGridStylesNames;
}>;

const classes: Record<DataGridStylesNames, string> = {
  root: 'mdg-root',
  toolbar: 'mdg-toolbar',
  scrollArea: 'mdg-scroll',
  table: 'mdg-table',
  header: 'mdg-thead',
  headerRow: 'mdg-tr mdg-header-row',
  headerCell: 'mdg-th',
  body: 'mdg-tbody',
  row: 'mdg-tr',
  cell: 'mdg-td',
  groupRow: 'mdg-tr mdg-group-row',
  footer: 'mdg-tr mdg-footer-row',
  footerCell: 'mdg-td mdg-tf',
  pagination: 'mdg-pagination',
  emptyState: 'mdg-state mdg-empty',
  errorState: 'mdg-state mdg-error',
};

let warnedVirtualization = false;

const toCssSize = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v);

/**
 * Enterprise data grid built on TanStack Table and Mantine.
 *
 * Generic over the row type: `<DataGrid<Employee> data={rows} columns={columns} />`.
 */
export function DataGrid<TData extends RowData>(inputProps: DataGridProps<TData>) {
  // Theme-level defaults: theme.components.DataGrid.defaultProps
  const props = useProps('DataGrid', {}, inputProps) as DataGridProps<TData>;
  const ctx = useDataGrid<TData>(props);
  const { table, features, labels, editing, density, rowHeight } = ctx;

  const getStyles = useStyles<DataGridFactory>({
    name: 'DataGrid',
    classes,
    props,
    className: props.className,
    style: props.style,
    classNames: props.classNames,
    styles: props.styles,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------- layout
  const columns = [...table.getLeftVisibleLeafColumns(), ...table.getCenterVisibleLeafColumns(), ...table.getRightVisibleLeafColumns()];
  const layoutKey = columns.map((c) => `${c.id}:${c.getSize()}:${c.getIsPinned() || ''}`).join('|');
  const layout = useMemo(
    () => computeColumnLayout(columns.map((c) => ({ id: c.id, size: c.getSize(), pinned: c.getIsPinned() }))),
    // layoutKey captures every input of the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  );
  const columnIds = useMemo(() => layout.map((l) => l.id), [layout]);
  const totalWidth = layout.reduce((sum, l) => sum + l.size, 0);
  const fill = (props.layoutMode ?? 'fill') === 'fill';

  // ---------------------------------------------------------------- rows
  const rows = table.getRowModel().rows;
  const virtualize = features.virtualization && (props.height !== undefined || props.maxHeight !== undefined);
  if (features.virtualization && !virtualize && !warnedVirtualization) {
    warnedVirtualization = true;
    console.warn('[DataGrid] enableVirtualization requires a `height` or `maxHeight`; rendering all rows.');
  }

  // Proxy that always reads the latest editing state; keeps memoised rows from
  // re-rendering on every unrelated edit while still seeing fresh values.
  const editingRef = useLatestRef(editing);
  const editingProxy = useMemo(
    () => new Proxy({} as GridEditing<TData>, { get: (_, key) => editingRef.current[key as keyof GridEditing<TData>] }),
    [editingRef],
  );
  const editVersion = (features.editing ? 1 : 0) + (editing.mode === 'row' ? 2 : 0) + (props.isRowEditable ? 4 : 0);

  // ---------------------------------------------------------------- navigation
  const scrollToIndexRef = ctx.scrollToIndexRef;
  const registerScrollToIndex = useCallback((fn: (index: number) => void) => {
    scrollToIndexRef.current = fn;
  }, [scrollToIndexRef]);
  const viewportRows = typeof props.height === 'number' ? Math.max(1, Math.floor(props.height / rowHeight) - 1) : 10;
  const nav = useGridNavigation<TData>({
    enabled: features.keyboardNavigation,
    gridRef,
    table,
    rows,
    columnIds,
    editing: editingProxy,
    selectionEnabled: features.selection,
    multiSelect: props.selectionMode !== 'single',
    scrollToRow: (index) => scrollToIndexRef.current?.(index),
    pageRows: viewportRows,
    editTrigger: props.editTrigger ?? 'doubleClick',
  });
  ctx.focusCellRef.current = (rowIndex, colIndex) => nav.moveTo({ row: rowIndex, col: colIndex });

  // ---------------------------------------------------------------- row handlers (stable)
  const latest = useLatestRef({ props, nav, editing: editingProxy, features, rows, columnIds });
  const handlers = useMemo<RowHandlers<TData>>(
    () => ({
      onRowClick: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => {
        const { props: p, features: f, editing: e } = latest.current;
        const target = event.target as HTMLElement;
        p.onRowClick?.(row, event);
        if (f.selection && p.selectOnRowClick && !row.getIsGrouped() && row.getCanSelect() && !target.closest('button, input, a, [role="checkbox"], .mdg-editor')) {
          row.toggleSelected(p.selectionMode === 'single' ? true : undefined);
        }
        if (f.editing && (p.editTrigger ?? 'doubleClick') === 'click') {
          const cell = target.closest<HTMLElement>('[data-column-id]');
          const columnId = cell?.dataset.columnId;
          if (columnId && e.isCellEditable(row, columnId) && !target.closest('.mdg-editor')) e.startEditing(row.id, columnId);
        }
      },
      onRowDoubleClick: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => {
        const { props: p, features: f, editing: e } = latest.current;
        p.onRowDoubleClick?.(row, event);
        if (!f.editing || (p.editTrigger ?? 'doubleClick') !== 'doubleClick') return;
        const target = event.target as HTMLElement;
        const columnId = target.closest<HTMLElement>('[data-column-id]')?.dataset.columnId;
        if (columnId && e.isCellEditable(row, columnId)) e.startEditing(row.id, columnId);
      },
      onTabNavigate: (rowIndex, colIndex, direction) => latest.current.nav.editNext(rowIndex, colIndex, direction),
      onEditorExit: (rowIndex, colIndex) => latest.current.nav.moveTo({ row: rowIndex, col: colIndex }),
      renderGroupHeader: props.renderGroupHeader
        ? (row) => {
            const columnId = row.groupingColumnId ?? '';
            return latest.current.props.renderGroupHeader?.({
              row,
              columnId,
              value: row.groupingValue,
              count: row.getLeafRows().filter((r) => !r.getIsGrouped()).length,
            });
          }
        : undefined,
      getRowClassName: props.getRowClassName ? (row) => latest.current.props.getRowClassName?.(row) : undefined,
      getRowStyle: props.getRowStyle ? (row) => latest.current.props.getRowStyle?.(row) : undefined,
      canDragRow: props.canDragRow ? (row) => latest.current.props.canDragRow?.(row) ?? true : undefined,
    }),
    [latest, !!props.renderGroupHeader, !!props.getRowClassName, !!props.getRowStyle, !!props.canDragRow], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ---------------------------------------------------------------- styles
  const s = (name: DataGridStylesNames) => getStyles(name);
  const cellStyles = { row: s('row'), cell: s('cell'), groupRow: s('groupRow'), body: s('body') };
  const classKey = `${cellStyles.row.className}|${cellStyles.cell.className}|${cellStyles.groupRow.className}|${cellStyles.body.className}`;
  const rowClassNames = useMemo(
    () => ({ row: cellStyles.row.className, cell: cellStyles.cell.className, groupRow: cellStyles.groupRow.className, body: cellStyles.body.className }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classKey],
  );
  const rowStyleKey = JSON.stringify([props.styles?.row, props.styles?.cell]);
  const rowStyles = useMemo(
    () => ({ row: cellStyles.row.style, cell: cellStyles.cell.style }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowStyleKey],
  );

  // A coarse version that forces memoised rows to re-render when consumer render inputs change.
  const renderVersionRef = useRef({ columns: props.columns, data: props.data, version: 0, density });
  if (renderVersionRef.current.columns !== props.columns || renderVersionRef.current.density !== density) {
    renderVersionRef.current = { columns: props.columns, data: props.data, version: renderVersionRef.current.version + 1, density };
  }
  const renderVersion = renderVersionRef.current.version;

  // ---------------------------------------------------------------- announcements
  const filteredCount = table.getFilteredRowModel().rows.length;
  const announceRef = useLatestRef(ctx.announce);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!props.manualFiltering) announceRef.current(labels.rowsAnnouncement(filteredCount));
  }, [filteredCount, announceRef, labels, props.manualFiltering]);

  // ---------------------------------------------------------------- derived render state
  const loading = !!props.loading;
  const showSkeleton = loading && rows.length === 0 && !props.error;
  const showEmpty = !loading && !props.error && rows.length === 0;
  const headerRowCount = Math.max(1, table.getHeaderGroups().length);
  const pagination = table.getState().pagination;
  const ariaRowOffset = headerRowCount + 1 + (features.pagination ? pagination.pageIndex * pagination.pageSize : 0);
  const totalRows = props.manualPagination && props.rowCount !== undefined ? props.rowCount : table.getPrePaginationRowModel().rows.length;
  const showFooter = props.showFooter ?? hasFooter(table);
  const sortableColumns = features.ordering && table.getHeaderGroups().length === 1;
  const sortableRows = features.rowDragging;
  const useDnd = sortableColumns || sortableRows;
  const preFilteredCount = table.getCoreRowModel().rows.length;

  const rootStyles = s('root');
  const scrollStyles = s('scrollArea');
  const tableStyles = s('table');
  const headerStyles = { header: s('header'), headerRow: s('headerRow'), headerCell: s('headerCell') };

  const gridAriaLabel = props['aria-label'];
  // Grouped / hierarchical rows follow the treegrid pattern (aria-level, aria-expanded).
  const tree = table.getState().grouping.length > 0 || !!props.getSubRows;
  const interactive = features.selection || features.editing || features.keyboardNavigation;
  const tableElement = (
    <div
      ref={gridRef}
      role={interactive ? (tree ? 'treegrid' : 'grid') : 'table'}
      aria-label={gridAriaLabel}
      aria-labelledby={props['aria-labelledby']}
      aria-rowcount={headerRowCount + totalRows + (showFooter ? 1 : 0)}
      aria-colcount={layout.length}
      aria-multiselectable={features.selection && props.selectionMode !== 'single' ? true : undefined}
      aria-busy={loading || undefined}
      className={tableStyles.className}
      style={{ ...tableStyles.style, minWidth: totalWidth }}
      onKeyDown={nav.onKeyDown}
      onFocus={(e) => nav.syncFromElement(e.target)}
    >
      <div ref={headerRef} className="mdg-thead-wrap" data-sticky={(props.stickyHeader ?? true) || undefined}>
        <GridHeader<TData>
          table={table}
          layout={layout}
          fill={fill}
          focusedCol={nav.focused.row === -1 ? nav.focused.col : -1}
          sortableColumns={sortableColumns}
          classNames={{ header: headerStyles.header.className, headerRow: headerStyles.headerRow.className, headerCell: headerStyles.headerCell.className }}
          styles={{ header: headerStyles.header.style, headerRow: headerStyles.headerRow.style, headerCell: headerStyles.headerCell.style }}
          sticky={props.stickyHeader ?? true}
        />
      </div>
      {props.error ? (
        <div role="rowgroup" className={rowClassNames.body}>
          {props.renderError ? (
            <div role="row" className={s('errorState').className}>
              <div role="gridcell" className="mdg-state-cell">
                {props.renderError(props.error)}
              </div>
            </div>
          ) : (
            <ErrorState error={props.error} labels={labels} onRetry={props.onRetry} className={s('errorState').className} style={s('errorState').style} />
          )}
        </div>
      ) : showSkeleton ? (
        <div role="rowgroup" className={rowClassNames.body}>
          <SkeletonRows count={props.skeletonRows ?? 8} layout={layout} fill={fill} rowClassName={rowClassNames.row} cellClassName={rowClassNames.cell} />
        </div>
      ) : showEmpty ? (
        <div role="rowgroup" className={rowClassNames.body}>
          {props.renderEmpty ? (
            <div role="row" className={s('emptyState').className}>
              <div role="gridcell" className="mdg-state-cell">
                {props.renderEmpty({ filtered: preFilteredCount > 0 })}
              </div>
            </div>
          ) : (
            <EmptyState filtered={preFilteredCount > 0} labels={labels} className={s('emptyState').className} style={s('emptyState').style} />
          )}
        </div>
      ) : (
        <GridBody<TData>
          rows={rows}
          ariaRowOffset={ariaRowOffset}
          layout={layout}
          layoutKey={layoutKey}
          fill={fill}
          focused={nav.focused}
          striped={!!props.striped}
          wrap={!!props.wrapText}
          editing={editingProxy}
          editVersion={editVersion}
          labels={labels}
          handlers={handlers}
          classNames={rowClassNames}
          styles={{ body: cellStyles.body.style }}
          rowStyles={rowStyles}
          virtualize={virtualize}
          scrollRef={scrollRef}
          headerRef={headerRef}
          rowHeight={rowHeight}
          dynamicRowHeight={!!props.dynamicRowHeight || !!props.wrapText}
          overscan={ctx.overscan}
          sortableRows={sortableRows}
          dragDisabled={ctx.rowDragDisabled || editing.active !== null}
          renderVersion={renderVersion}
          tree={tree}
          registerScrollToIndex={registerScrollToIndex}
        />
      )}
      {showFooter && !props.error && (
        <GridFooter<TData>
          table={table}
          layout={layout}
          fill={fill}
          ariaRowIndex={headerRowCount + totalRows + 1}
          labels={labels}
          className={s('footer').className}
          cellClassName={s('footerCell').className}
          style={s('footer').style}
          cellStyle={s('footerCell').style}
        />
      )}
    </div>
  );

  const rootVars = {
    '--dg-row-height': `${rowHeight}px`,
    '--dg-height': toCssSize(props.height),
    '--dg-max-height': toCssSize(props.maxHeight),
  } as CSSProperties;

  return (
    <DataGridProvider value={ctx}>
      <div
        className={rootStyles.className}
        style={{ ...rootVars, ...rootStyles.style }}
        data-density={density}
        data-striped={props.striped || undefined}
        data-with-column-borders={props.withColumnBorders || undefined}
        data-with-row-borders={(props.withRowBorders ?? true) || undefined}
        data-with-border={(props.withBorder ?? true) || undefined}
        data-hover={(props.highlightOnHover ?? true) || undefined}
        data-wrap={props.wrapText || undefined}
        data-virtualized={virtualize || undefined}
        data-layout={fill ? 'fill' : 'fixed'}
      >
        {features.toolbar && <DataGridToolbar<TData> className={s('toolbar').className} style={s('toolbar').style} />}
        <div className="mdg-viewport">
        <div
          ref={scrollRef}
          className={scrollStyles.className}
          style={{ ...scrollStyles.style, height: toCssSize(props.height), maxHeight: toCssSize(props.maxHeight) }}
          data-has-height={props.height !== undefined || props.maxHeight !== undefined || undefined}
        >
          {useDnd ? (
            <GridDndProvider table={table} data={props.data} onRowReorder={props.onRowReorder}>
              {tableElement}
            </GridDndProvider>
          ) : (
            tableElement
          )}
        </div>
          <LoadingOverlay visible={loading && !showSkeleton} zIndex={6} overlayProps={{ blur: 0, backgroundOpacity: 0.35 }} loaderProps={{ size: 'sm' }} />
        </div>
        {features.pagination && <GridPagination<TData> className={s('pagination').className} style={s('pagination').style} />}
        <div className="mdg-sr-only" aria-live="polite" aria-atomic="true" role="status">
          {ctx.announcement}
        </div>
      </div>
    </DataGridProvider>
  );
}

export type { DataGridProps };

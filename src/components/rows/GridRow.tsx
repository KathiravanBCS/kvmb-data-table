import { memo, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Row, RowData } from '@tanstack/react-table';
import clsx from 'clsx';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import type { GridEditing, GridSaveState } from '../../features/editing/useGridEditing';
import type { RowEditState } from '../../features/editing/editing.types';
import type { DataGridLabels } from '../../core/grid.defaults';
import { GridCell } from '../cells/GridCell';
import { DragHandleContext } from '../../features/drag-drop/RowDragContext';

export interface RowHandlers<TData extends RowData> {
  onRowClick: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => void;
  onRowDoubleClick: (row: Row<TData>, event: MouseEvent<HTMLDivElement>) => void;
  onTabNavigate: (rowIndex: number, colIndex: number, direction: 1 | -1) => void;
  onEditorExit: (rowIndex: number, colIndex: number) => void;
  renderGroupHeader?: (row: Row<TData>) => ReactNode;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getRowStyle?: (row: Row<TData>) => CSSProperties | undefined;
  canDragRow?: (row: Row<TData>) => boolean;
}

export interface GridRowProps<TData extends RowData> {
  row: Row<TData>;
  /** Index within the rendered row model (used for keyboard navigation). */
  rowIndex: number;
  /** 1-based aria-rowindex. */
  ariaRowIndex: number;
  layout: ColumnLayoutItem[];
  /** Changes whenever column layout changes (sizes, order, visibility, pinning). */
  layoutKey: string;
  fill: boolean;
  selected: boolean;
  expanded: boolean;
  /** Column index of the focused cell in this row, or -1. */
  focusedCol: number;
  striped: boolean;
  wrap: boolean;
  /** Edit state for this row (only defined while editing / saving it). */
  activeEditColumn: string | null | undefined;
  editState: RowEditState | undefined;
  saveState: GridSaveState | undefined;
  /** Bumped when the editing configuration changes. */
  editVersion: number;
  editing: GridEditing<TData>;
  labels: DataGridLabels;
  handlers: RowHandlers<TData>;
  classNames: { row: string; cell: string; groupRow: string };
  styles: { row?: CSSProperties; cell?: CSSProperties };
  measureRef?: (element: HTMLElement | null) => void;
  dataIndex?: number;
  sortable: boolean;
  dragDisabled: boolean;
  /** Bumped when consumer-provided rendering inputs (columns, renderers) change. */
  renderVersion: number;
  /** Grid is a treegrid (grouping / sub rows): expose aria-level / aria-expanded. */
  tree: boolean;
}

function RowInner<TData extends RowData>(props: GridRowProps<TData> & { dragBindings?: SortableBindings; setNodeRef?: (el: HTMLElement | null) => void; dragStyle?: CSSProperties }) {
  const { row, rowIndex, layout, fill, focusedCol, editing, labels, handlers, classNames, styles, editState, saveState, activeEditColumn } = props;
  const cellsById = row._getAllCellsByColumnId();
  const isGroup = row.getIsGrouped();
  const rowEditing = activeEditColumn !== undefined;

  const setRef = (el: HTMLDivElement | null) => {
    props.setNodeRef?.(el);
    props.measureRef?.(el);
  };

  const firstDraftCol = editState ? layout.findIndex((l) => l.id in editState.draft) : -1;
  const customGroup = isGroup && handlers.renderGroupHeader ? handlers.renderGroupHeader(row) : null;

  const rowElement = (
    <div
      ref={setRef}
      role="row"
      aria-rowindex={props.ariaRowIndex}
      aria-selected={row.getCanSelect() ? props.selected : undefined}
      aria-expanded={props.tree && (isGroup || row.getCanExpand()) ? props.expanded : undefined}
      aria-level={props.tree ? row.depth + 1 : undefined}
      data-index={props.dataIndex}
      data-row-id={row.id}
      data-selected={props.selected || undefined}
      data-group={isGroup || undefined}
      data-striped={props.striped || undefined}
      data-editing={rowEditing || undefined}
      data-saving={saveState?.status === 'saving' || undefined}
      data-save-error={saveState?.status === 'error' || undefined}
      data-dragging={props.dragBindings?.isDragging || undefined}
      className={clsx(isGroup ? classNames.groupRow : classNames.row, handlers.getRowClassName?.(row))}
      style={{ ...styles.row, ...handlers.getRowStyle?.(row), ...props.dragStyle }}
      onClick={(e) => handlers.onRowClick(row, e)}
      onDoubleClick={(e) => handlers.onRowDoubleClick(row, e)}
    >
      {customGroup ? (
        <div
          role="gridcell"
          aria-colindex={1}
          aria-colspan={layout.length}
          tabIndex={focusedCol >= 0 ? 0 : -1}
          data-row-index={rowIndex}
          data-col-index={0}
          className={clsx(classNames.cell, 'mdg-group-header-cell')}
          style={{ flex: '1 0 auto', paddingInlineStart: `calc(${row.depth} * var(--dg-group-indent) + var(--dg-cell-px))` }}
        >
          {customGroup}
        </div>
      ) : (
        layout.map((item, colIndex) => {
          const cell = cellsById[item.id];
          if (!cell) return null;
          const editable = editing.enabled && !isGroup && editing.isCellEditable(row, item.id);
          const editingCell =
            rowEditing && editable && (editing.mode === 'row' || activeEditColumn === item.id) && !!editState && item.id in editState.draft;
          return (
            <GridCell
              key={item.id}
              cell={cell}
              layout={item}
              fill={fill}
              rowIndex={rowIndex}
              colIndex={colIndex}
              focused={focusedCol === colIndex}
              editingCell={editingCell}
              draftValue={editState?.draft[item.id]}
              hasDraft={!!editState && item.id in editState.draft}
              error={editState?.errors[item.id] ?? (editingCell && colIndex === firstDraftCol ? (editState?.errors._row ?? null) : null)}
              pending={!!editState?.validating || saveState?.status === 'saving'}
              autoFocusEditor={editing.mode === 'cell' || (activeEditColumn ? activeEditColumn === item.id : colIndex === firstDraftCol)}
              saveState={saveState}
              editable={editable}
              editing={editing}
              labels={labels}
              wrap={props.wrap}
              className={classNames.cell}
              style={styles.cell}
              onTabNavigate={handlers.onTabNavigate}
              onEditorExit={handlers.onEditorExit}
            />
          );
        })
      )}
    </div>
  );

  if (props.dragBindings) {
    return <DragHandleContext.Provider value={props.dragBindings}>{rowElement}</DragHandleContext.Provider>;
  }
  return rowElement;
}

type SortableBindings = NonNullable<React.ContextType<typeof DragHandleContext>>;

function SortableRow<TData extends RowData>(props: GridRowProps<TData>) {
  const disabled = props.dragDisabled || props.row.getIsGrouped() || props.handlers.canDragRow?.(props.row) === false;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.row.id,
    data: { type: 'row' },
    disabled,
  });
  const dragStyle: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    position: isDragging ? 'relative' : undefined,
  };
  return (
    <RowInner
      {...props}
      setNodeRef={setNodeRef}
      dragStyle={dragStyle}
      dragBindings={{ attributes, listeners, setActivatorNodeRef, disabled, isDragging }}
    />
  );
}

function GridRowImpl<TData extends RowData>(props: GridRowProps<TData>) {
  return props.sortable ? <SortableRow {...props} /> : <RowInner {...props} />;
}

function areEqual<TData extends RowData>(prev: GridRowProps<TData>, next: GridRowProps<TData>): boolean {
  return (
    prev.row === next.row &&
    prev.rowIndex === next.rowIndex &&
    prev.ariaRowIndex === next.ariaRowIndex &&
    prev.layoutKey === next.layoutKey &&
    prev.fill === next.fill &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    prev.focusedCol === next.focusedCol &&
    prev.striped === next.striped &&
    prev.wrap === next.wrap &&
    prev.activeEditColumn === next.activeEditColumn &&
    prev.editState === next.editState &&
    prev.saveState === next.saveState &&
    prev.editVersion === next.editVersion &&
    prev.labels === next.labels &&
    prev.classNames === next.classNames &&
    prev.styles === next.styles &&
    prev.measureRef === next.measureRef &&
    prev.dataIndex === next.dataIndex &&
    prev.sortable === next.sortable &&
    prev.dragDisabled === next.dragDisabled &&
    prev.renderVersion === next.renderVersion &&
    prev.tree === next.tree
  );
}

/**
 * Memoised row: re-renders only when its row object, selection/expansion,
 * focus, edit state or the column layout changes.
 */
export const GridRow = memo(GridRowImpl, areEqual) as <TData extends RowData>(props: GridRowProps<TData>) => ReactNode;

import type { CSSProperties, ReactNode } from 'react';
import { Loader, Tooltip } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { flexRender, type Cell, type RowData } from '@tanstack/react-table';
import clsx from 'clsx';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import { getCellLayoutStyle } from '../../features/pinning/pinning';
import { getColumnAlign } from '../../utils/columns';
import type { DataGridLabels } from '../../core/grid.defaults';
import type { GridEditing, GridSaveState } from '../../features/editing/useGridEditing';
import { CellEditorHost } from '../editors/CellEditor';
import { shallowEqualValue } from '../../features/editing/editing.utils';
import { Expander } from '../../features/expanding/Expander';

export interface GridCellProps<TData extends RowData> {
  cell: Cell<TData, unknown>;
  layout: ColumnLayoutItem;
  fill: boolean;
  rowIndex: number;
  colIndex: number;
  focused: boolean;
  /** Cell is in edit mode. */
  editingCell: boolean;
  draftValue: unknown;
  hasDraft: boolean;
  error: string | null;
  pending: boolean;
  /** Focus the editor when it mounts. */
  autoFocusEditor: boolean;
  saveState: GridSaveState | undefined;
  editable: boolean;
  editing: GridEditing<TData>;
  labels: DataGridLabels;
  wrap: boolean;
  /** This column shows the tree expander and indentation (`getSubRows` data). */
  treeCell?: boolean;
  className: string;
  style?: CSSProperties;
  onTabNavigate: (rowIndex: number, colIndex: number, direction: 1 | -1) => void;
  onEditorExit: (rowIndex: number, colIndex: number) => void;
}

export function GridCell<TData extends RowData>(props: GridCellProps<TData>) {
  const { cell, layout, fill, rowIndex, colIndex, focused, editingCell, labels, editing } = props;
  const { column, row } = cell;
  const meta = column.columnDef.meta;
  const align = getColumnAlign(column);

  let content: ReactNode;
  if (editingCell) {
    content = (
      <CellEditorHost
        cell={cell}
        editing={editing}
        value={props.draftValue}
        error={props.error}
        pending={props.pending}
        autoFocus={props.autoFocusEditor}
        onTabNavigate={(direction) => props.onTabNavigate(rowIndex, colIndex, direction)}
        onExit={() => props.onEditorExit(rowIndex, colIndex)}
      />
    );
  } else if (cell.getIsGrouped()) {
    content = (
      <span className="mdg-group-cell" style={{ paddingInlineStart: `calc(${row.depth} * var(--dg-group-indent))` }}>
        <Expander row={row} expandLabel={labels.expandGroup} collapseLabel={labels.collapseGroup} />
        <span className="mdg-cell-text">{flexRender(column.columnDef.cell, cell.getContext())}</span>
        <span className="mdg-group-count">
          (
          {row
            .getLeafRows()
            .filter((r) => !r.getIsGrouped())
            .length.toLocaleString()}
          )
        </span>
      </span>
    );
  } else if (cell.getIsAggregated() && row.getIsGrouped()) {
    content = flexRender(column.columnDef.aggregatedCell ?? column.columnDef.cell, cell.getContext());
  } else if (cell.getIsPlaceholder()) {
    content = null;
  } else if (props.treeCell) {
    content = (
      <span className="mdg-tree-cell" style={{ paddingInlineStart: `calc(${row.depth} * var(--dg-group-indent))` }}>
        {row.subRows.length > 0 && row.getCanExpand() ? (
          <Expander row={row} expandLabel={labels.expandRow} collapseLabel={labels.collapseRow} />
        ) : (
          <span className="mdg-expander-spacer" aria-hidden />
        )}
        <span className="mdg-cell-text">{flexRender(column.columnDef.cell, cell.getContext())}</span>
      </span>
    );
  } else {
    content = flexRender(column.columnDef.cell, cell.getContext());
  }

  const save = props.saveState && props.saveState.columns.includes(column.id) ? props.saveState : undefined;
  const dirty = editingCell && props.hasDraft && !shallowEqualValue(props.draftValue, cell.getValue());
  const extraClass = typeof meta?.cellClassName === 'function' ? meta.cellClassName(cell) : meta?.cellClassName;
  const extraStyle = typeof meta?.cellStyle === 'function' ? meta.cellStyle(cell) : meta?.cellStyle;

  return (
    <div
      role="gridcell"
      aria-colindex={colIndex + 1}
      aria-readonly={editing.enabled && !props.editable ? true : undefined}
      aria-invalid={props.error ? true : undefined}
      tabIndex={focused ? 0 : -1}
      data-row-index={rowIndex}
      data-col-index={colIndex}
      data-column-id={column.id}
      data-align={align}
      data-pinned={layout.pinned || undefined}
      data-pinned-edge={layout.edge ? layout.pinned : undefined}
      data-editable={props.editable || undefined}
      data-editing={editingCell || undefined}
      data-dirty={dirty || undefined}
      data-wrap={(meta?.wrap ?? props.wrap) || undefined}
      data-tree={props.treeCell || undefined}
      data-saving={save?.status === 'saving' || undefined}
      data-save-error={save?.status === 'error' || undefined}
      className={clsx(props.className, extraClass)}
      style={{ ...getCellLayoutStyle(layout, fill), ...props.style, ...extraStyle }}
    >
      {editingCell ? content : <div className="mdg-cell-content">{content}</div>}
      {save?.status === 'saving' && <Loader size={12} className="mdg-cell-status" aria-label={labels.saving} />}
      {save?.status === 'error' && (
        <Tooltip label={`${labels.saveFailed}: ${save.error ?? ''}`} withinPortal>
          <span className="mdg-cell-status mdg-cell-status-error" role="img" aria-label={`${labels.saveFailed}: ${save.error ?? ''}`}>
            <IconAlertTriangle size={14} />
          </span>
        </Tooltip>
      )}
    </div>
  );
}

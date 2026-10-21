import { useCallback, useRef, type KeyboardEvent } from 'react';
import { Tooltip } from '@mantine/core';
import type { Cell, RowData } from '@tanstack/react-table';
import type { CellEditorComponent } from '../../features/editing/editing.types';
import { resolveEditorKind } from '../../features/editing/editing.utils';
import { builtInEditors, EDITOR_DROPDOWN_CLASS } from './editors';
import type { GridEditing } from '../../features/editing/useGridEditing';
import { getColumnLabel } from '../../utils/columns';

export interface CellEditorHostProps<TData extends RowData> {
  cell: Cell<TData, unknown>;
  editing: GridEditing<TData>;
  value: unknown;
  error: string | null;
  pending: boolean;
  autoFocus: boolean;
  /** Called after a Tab-commit to move editing to the next/previous editable cell. */
  onTabNavigate?: (direction: 1 | -1) => void;
  /** Called after Enter/Escape so focus can return to the cell. */
  onExit?: () => void;
}

function isDropdownOpen(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.getAttribute('aria-expanded') === 'true';
}

/**
 * Hosts a built-in or custom editor and implements the editing keyboard contract:
 * Enter commits, Escape cancels, Tab commits and moves (cell mode); clicking
 * outside commits in cell mode.
 */
export function CellEditorHost<TData extends RowData>({
  cell,
  editing,
  value,
  error,
  pending,
  autoFocus,
  onTabNavigate,
  onExit,
}: CellEditorHostProps<TData>) {
  const { column, row } = cell;
  const kind = resolveEditorKind(column);
  const Editor = (kind === 'custom' ? column.columnDef.meta?.editor : builtInEditors[kind]) as CellEditorComponent<TData, unknown>;
  const options = column.columnDef.meta?.editorOptions ?? column.columnDef.meta?.filterOptions ?? [];
  const hostRef = useRef<HTMLDivElement>(null);
  const cellMode = editing.mode === 'cell';

  const onChange = useCallback((next: unknown) => editing.setDraftValue(row.id, column.id, next), [editing, row.id, column.id]);
  const onCommit = useCallback(() => {
    void editing.commit().then((ok) => ok && onExit?.());
  }, [editing, onExit]);
  const onCancel = useCallback(() => {
    editing.cancel();
    onExit?.();
  }, [editing, onExit]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation(); // keep grid navigation out of the editor
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      if (isDropdownOpen(event.target)) return;
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      if (isDropdownOpen(event.target)) return;
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Tab' && cellMode && onTabNavigate) {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      void editing.commit().then((ok) => ok && onTabNavigate(direction));
    }
  };

  const handleBlur = () => {
    if (!cellMode) return;
    // Wait for focus to settle (portalled dropdowns, date pickers).
    setTimeout(() => {
      const active = document.activeElement;
      if (hostRef.current?.contains(active)) return;
      if (active instanceof HTMLElement && active.closest(`.${EDITOR_DROPDOWN_CLASS}`)) return;
      const current = editing.getActive();
      if (current?.rowId === row.id && current.columnId === column.id) void editing.commit();
    }, 0);
  };

  const editor = (
    <Editor
      value={value}
      onChange={onChange}
      onCommit={onCommit}
      onCancel={onCancel}
      row={row}
      columnId={column.id}
      error={error}
      pending={pending}
      autoFocus={autoFocus}
      options={options}
      label={getColumnLabel(column)}
    />
  );

  return (
    <div ref={hostRef} className="mdg-editor" onKeyDown={handleKeyDown} onBlur={handleBlur} onDoubleClick={(e) => e.stopPropagation()} data-invalid={error ? '' : undefined}>
      {/* Always rendered (disabled when valid) so the editor never remounts and keeps focus. */}
      <Tooltip label={error ?? ''} opened={!!error} disabled={!error} color="red" position="bottom-start" withinPortal withArrow>
        <div className="mdg-editor-inner">{editor}</div>
      </Tooltip>
    </div>
  );
}

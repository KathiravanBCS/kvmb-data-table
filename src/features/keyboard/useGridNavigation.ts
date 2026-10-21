import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { Row, RowData, Table } from '@tanstack/react-table';
import type { GridEditing } from '../editing/useGridEditing';
import { resolveEditorKind } from '../editing/editing.utils';

export interface FocusPosition {
  /** -1 = leaf header row. */
  row: number;
  col: number;
}

export interface UseGridNavigationOptions<TData extends RowData> {
  enabled: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  table: Table<TData>;
  rows: Row<TData>[];
  columnIds: string[];
  editing: GridEditing<TData>;
  selectionEnabled: boolean;
  multiSelect: boolean;
  /** Scrolls a body row into view (virtualizer aware). */
  scrollToRow: (index: number) => void;
  /** Rows per "page" for PageUp/PageDown. */
  pageRows: number;
  editTrigger: 'doubleClick' | 'click' | 'manual';
}

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

function findCellElement(grid: HTMLElement | null, pos: FocusPosition): HTMLElement | null {
  return grid?.querySelector<HTMLElement>(`[data-row-index="${pos.row}"][data-col-index="${pos.col}"]`) ?? null;
}

/**
 * Roving-tabindex keyboard navigation following the WAI-ARIA grid pattern:
 * arrows, Home/End (Ctrl for first/last row), PageUp/PageDown, Enter/F2 to edit
 * or toggle groups, Space to select, typing to start editing.
 */
export function useGridNavigation<TData extends RowData>(options: UseGridNavigationOptions<TData>) {
  const [focused, setFocused] = useState<FocusPosition>({ row: -1, col: 0 });
  const pendingFocus = useRef<FocusPosition | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const rowCount = options.rows.length;
  const colCount = options.columnIds.length;

  // Keep the focus position inside the grid when rows/columns change.
  useEffect(() => {
    setFocused((prev) => {
      const row = Math.min(prev.row, rowCount - 1);
      const col = Math.min(prev.col, Math.max(0, colCount - 1));
      return row === prev.row && col === prev.col ? prev : { row: Math.max(-1, row), col };
    });
  }, [rowCount, colCount]);

  const tryFocus = useCallback((attempt = 0) => {
    const target = pendingFocus.current;
    if (!target) return;
    const el = findCellElement(optionsRef.current.gridRef.current, target);
    if (el) {
      pendingFocus.current = null;
      el.focus({ preventScroll: false });
      return;
    }
    // Virtualized rows may need a few frames to render after scrolling.
    if (attempt < 6) requestAnimationFrame(() => tryFocus(attempt + 1));
  }, []);

  const moveTo = useCallback(
    (pos: FocusPosition, focus = true) => {
      const { rows, columnIds } = optionsRef.current;
      const row = Math.max(-1, Math.min(pos.row, rows.length - 1));
      const col = Math.max(0, Math.min(pos.col, columnIds.length - 1));
      const next = { row, col };
      setFocused(next);
      if (row >= 0) optionsRef.current.scrollToRow(row);
      if (focus) {
        // Focus synchronously when the cell is already rendered so rapid key
        // repeats navigate from the new position; otherwise wait for render.
        pendingFocus.current = next;
        tryFocus();
      }
    },
    [tryFocus],
  );

  const syncFromElement = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest<HTMLElement>('[data-row-index][data-col-index]');
    if (!cell || !optionsRef.current.gridRef.current?.contains(cell)) return;
    const row = Number(cell.dataset.rowIndex);
    const col = Number(cell.dataset.colIndex);
    setFocused((prev) => (prev.row === row && prev.col === col ? prev : { row, col }));
  }, []);

  const findEditable = useCallback((from: FocusPosition, direction: 1 | -1): FocusPosition | null => {
    const { rows, columnIds, editing } = optionsRef.current;
    let { row, col } = from;
    for (let guard = 0; guard < rows.length * columnIds.length + 1; guard++) {
      col += direction;
      if (col >= columnIds.length) {
        col = 0;
        row += 1;
      } else if (col < 0) {
        col = columnIds.length - 1;
        row -= 1;
      }
      if (row < 0 || row >= rows.length) return null;
      if (editing.isCellEditable(rows[row], columnIds[col])) return { row, col };
    }
    return null;
  }, []);

  /** Tab / Shift+Tab out of an editor in cell mode. */
  const editNext = useCallback(
    (row: number, col: number, direction: 1 | -1) => {
      const target = findEditable({ row, col }, direction);
      const { rows, columnIds, editing } = optionsRef.current;
      if (!target) {
        moveTo({ row, col });
        return;
      }
      moveTo(target, false);
      editing.startEditing(rows[target.row].id, columnIds[target.col]);
    },
    [findEditable, moveTo],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const opts = optionsRef.current;
      if (!opts.enabled || event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      const cell = target.closest<HTMLElement>('[data-row-index][data-col-index]');
      if (!cell) return;
      // Only handle keys on the cell itself or on pass-through controls (checkboxes, expanders).
      if (target !== cell && !target.hasAttribute('data-dg-nav-passthrough')) return;

      const row = Number(cell.dataset.rowIndex);
      const col = Number(cell.dataset.colIndex);
      const { rows, columnIds, editing, table } = opts;
      const minRow = -1;
      const lastRow = rows.length - 1;
      const lastCol = columnIds.length - 1;
      const ctrl = event.ctrlKey || event.metaKey;

      if (NAV_KEYS.has(event.key)) {
        let next: FocusPosition | null = null;
        switch (event.key) {
          case 'ArrowUp':
            next = { row: Math.max(minRow, row - 1), col };
            break;
          case 'ArrowDown':
            next = { row: Math.min(lastRow, row + 1), col };
            break;
          case 'ArrowLeft':
            if (event.altKey) return; // reserved for column resizing on headers
            next = { row, col: Math.max(0, col - 1) };
            break;
          case 'ArrowRight':
            if (event.altKey) return;
            next = { row, col: Math.min(lastCol, col + 1) };
            break;
          case 'Home':
            next = ctrl ? { row: rows.length ? 0 : -1, col: 0 } : { row, col: 0 };
            break;
          case 'End':
            next = ctrl ? { row: lastRow, col: lastCol } : { row, col: lastCol };
            break;
          case 'PageUp':
            next = { row: Math.max(row < 0 ? -1 : 0, row - opts.pageRows), col };
            break;
          case 'PageDown':
            next = { row: Math.min(lastRow, Math.max(0, row + opts.pageRows)), col };
            break;
        }
        if (event.key === 'ArrowDown' && event.altKey) return; // header menu shortcut
        event.preventDefault();
        if (next) moveTo(next);
        return;
      }

      if (row < 0) return; // remaining shortcuts apply to body cells
      const gridRow = rows[row];
      const columnId = columnIds[col];
      if (!gridRow) return;

      if (event.key === 'Enter' || event.key === 'F2') {
        if (gridRow.getIsGrouped() || (target.hasAttribute('data-dg-nav-passthrough') && target !== cell)) {
          if (gridRow.getIsGrouped() && event.key === 'Enter') {
            event.preventDefault();
            gridRow.toggleExpanded();
          }
          return;
        }
        if (opts.editTrigger !== 'manual' && editing.isCellEditable(gridRow, columnId)) {
          event.preventDefault();
          editing.startEditing(gridRow.id, columnId);
        }
        return;
      }

      if (event.key === ' ' && target === cell) {
        if (gridRow.getIsGrouped()) {
          event.preventDefault();
          gridRow.toggleExpanded();
        } else if (opts.selectionEnabled && gridRow.getCanSelect()) {
          event.preventDefault();
          gridRow.toggleSelected(opts.multiSelect ? undefined : true);
        }
        return;
      }

      if (ctrl && (event.key === 'a' || event.key === 'A') && opts.selectionEnabled && opts.multiSelect) {
        event.preventDefault();
        table.toggleAllRowsSelected(true);
        return;
      }

      // Typing a printable character starts editing text/number cells with that character.
      if (
        event.key.length === 1 &&
        !ctrl &&
        !event.altKey &&
        target === cell &&
        opts.editTrigger !== 'manual' &&
        editing.mode === 'cell' &&
        editing.isCellEditable(gridRow, columnId)
      ) {
        const column = table.getColumn(columnId);
        const kind = column ? resolveEditorKind(column) : 'custom';
        if (kind === 'text' || (kind === 'number' && /[\d.-]/.test(event.key))) {
          event.preventDefault();
          editing.startEditing(gridRow.id, columnId, kind === 'number' ? Number(event.key) || event.key : event.key);
        }
      }
    },
    [moveTo],
  );

  return { focused, setFocused, moveTo, onKeyDown, syncFromElement, editNext };
}

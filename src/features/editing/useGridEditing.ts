import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Row, RowData, Table } from '@tanstack/react-table';
import type {
  EditMode,
  RowEditState,
  RowSaveState,
  RowUpdateHandler,
  RowValidator,
  ValidationResult,
} from './editing.types';
import { errorMessage, isCellEditable, setColumnValue, shallowEqualValue } from './editing.utils';

export interface ActiveEdit {
  rowId: string;
  /** Edited column in cell mode; `null` in row mode. */
  columnId: string | null;
}

export interface GridSaveState extends RowSaveState {
  /** Columns changed by the save. */
  columns: string[];
}

export interface UseGridEditingOptions<TData extends RowData> {
  enabled: boolean;
  mode: EditMode;
  getTable: () => Table<TData> | null;
  data: TData[];
  isRowEditable?: (row: TData) => boolean;
  onRowUpdate?: RowUpdateHandler<TData>;
  validateRow?: RowValidator<TData>;
  optimistic: boolean;
  onEditError?: (error: unknown, row: TData) => void;
  saveFailedLabel: string;
}

export interface GridEditing<TData extends RowData> {
  enabled: boolean;
  mode: EditMode;
  active: ActiveEdit | null;
  /** Reads the active edit synchronously (safe inside async callbacks / timeouts). */
  getActive: () => ActiveEdit | null;
  drafts: Record<string, RowEditState>;
  saveStates: Record<string, GridSaveState>;
  /** Optimistic row values keyed by row id. */
  overrides: Record<string, TData>;
  isCellEditable: (row: Row<TData>, columnId: string) => boolean;
  startEditing: (rowId: string, columnId?: string, initialValue?: unknown) => void;
  setDraftValue: (rowId: string, columnId: string, value: unknown) => void;
  commit: () => Promise<boolean>;
  cancel: () => void;
  isDirty: (rowId: string) => boolean;
  dismissSaveError: (rowId: string) => void;
}

const isValidationError = (result: ValidationResult): result is string => typeof result === 'string' && result.length > 0;

export function useGridEditing<TData extends RowData>(options: UseGridEditingOptions<TData>): GridEditing<TData> {
  const [active, setActiveState] = useState<ActiveEdit | null>(null);
  const [drafts, setDraftsState] = useState<Record<string, RowEditState>>({});
  const [saveStates, setSaveStatesState] = useState<Record<string, GridSaveState>>({});
  const [overrides, setOverridesState] = useState<Record<string, TData>>({});

  // Refs mirror state so async commit logic always sees the latest values.
  const activeRef = useRef(active);
  const draftsRef = useRef(drafts);
  const saveRef = useRef(saveStates);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setActive = useCallback((next: ActiveEdit | null) => {
    activeRef.current = next;
    setActiveState(next);
  }, []);
  const setDrafts = useCallback((updater: (prev: Record<string, RowEditState>) => Record<string, RowEditState>) => {
    draftsRef.current = updater(draftsRef.current);
    setDraftsState(draftsRef.current);
  }, []);
  const setSave = useCallback((rowId: string, state: GridSaveState | null) => {
    const next = { ...saveRef.current };
    if (state) next[rowId] = state;
    else delete next[rowId];
    saveRef.current = next;
    setSaveStatesState(next);
  }, []);
  const setOverride = useCallback((rowId: string, row: TData | null) => {
    setOverridesState((prev) => {
      const next = { ...prev };
      if (row) next[rowId] = row;
      else delete next[rowId];
      return next;
    });
  }, []);

  // New data from the consumer is authoritative: drop settled optimistic overrides.
  const { data } = options;
  useEffect(() => {
    setOverridesState((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const next: Record<string, TData> = {};
      for (const k of keys) if (saveRef.current[k]?.status === 'saving') next[k] = prev[k];
      return next;
    });
  }, [data]);

  const checkCellEditable = useCallback((row: Row<TData>, columnId: string) => {
    const opts = optionsRef.current;
    if (!opts.enabled) return false;
    const column = opts.getTable()?.getColumn(columnId);
    return !!column && isCellEditable(row, column, opts.isRowEditable);
  }, []);

  const finish = useCallback(
    (rowId: string) => {
      if (activeRef.current?.rowId === rowId) setActive(null);
      setDrafts((prev) => {
        if (!(rowId in prev)) return prev;
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    },
    [setActive, setDrafts],
  );

  const commit = useCallback(async (): Promise<boolean> => {
    const current = activeRef.current;
    if (!current) return true;
    const { rowId } = current;
    const opts = optionsRef.current;
    const table = opts.getTable();
    const state = draftsRef.current[rowId];
    let row: Row<TData> | undefined;
    try {
      row = table?.getRow(rowId, true);
    } catch {
      row = undefined;
    }
    if (!table || !row || !state) {
      // Row disappeared (e.g. data refreshed): nothing to save.
      finish(rowId);
      return false;
    }

    const original = row.original;
    let candidate = original;
    const changes: Record<string, unknown> = {};
    const parsed: Record<string, unknown> = {};
    for (const [columnId, raw] of Object.entries(state.draft)) {
      const column = table.getColumn(columnId);
      if (!column) continue;
      const value = column.columnDef.meta?.parseValue ? column.columnDef.meta.parseValue(raw) : raw;
      parsed[columnId] = value;
      if (!shallowEqualValue(value, row.getValue(columnId))) {
        changes[columnId] = value;
        candidate = setColumnValue(candidate, column, value);
      }
    }

    // ---- validation (sync + async) ----
    const needsAsync = Object.keys(parsed).some((id) => table.getColumn(id)?.columnDef.meta?.validate) || !!opts.validateRow;
    if (needsAsync) {
      setDrafts((prev) => (prev[rowId] ? { ...prev, [rowId]: { ...prev[rowId], validating: true } } : prev));
    }
    const errors: Record<string, string> = {};
    try {
      await Promise.all(
        Object.entries(parsed).map(async ([columnId, value]) => {
          const validate = table.getColumn(columnId)?.columnDef.meta?.validate;
          if (!validate) return;
          const result = await validate(value, candidate);
          if (isValidationError(result)) errors[columnId] = result;
        }),
      );
      if (opts.validateRow) {
        const rowErrors = await opts.validateRow(candidate);
        if (rowErrors) Object.assign(errors, rowErrors);
      }
    } catch (error) {
      errors._row = errorMessage(error, opts.saveFailedLabel);
    }
    // The user may have cancelled or moved on while validation was running.
    if (activeRef.current?.rowId !== rowId || !draftsRef.current[rowId]) return false;
    if (Object.keys(errors).length) {
      setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId], errors, validating: false } }));
      return false;
    }
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId], errors: {}, validating: false } }));

    if (Object.keys(changes).length === 0) {
      finish(rowId);
      return true;
    }

    const context = { rowId, originalRow: original, changes };
    const columns = Object.keys(changes);

    if (opts.optimistic) {
      setOverride(rowId, candidate);
      finish(rowId);
      setSave(rowId, { status: 'saving', columns });
      try {
        const result = await opts.onRowUpdate?.(candidate, context);
        if (result) setOverride(rowId, result);
        setSave(rowId, null);
        return true;
      } catch (error) {
        setOverride(rowId, null); // roll back
        setSave(rowId, { status: 'error', error: errorMessage(error, opts.saveFailedLabel), columns });
        opts.onEditError?.(error, candidate);
        return false;
      }
    }

    setSave(rowId, { status: 'saving', columns });
    try {
      const result = await opts.onRowUpdate?.(candidate, context);
      setOverride(rowId, result ?? candidate);
      setSave(rowId, null);
      finish(rowId);
      return true;
    } catch (error) {
      const message = errorMessage(error, opts.saveFailedLabel);
      setSave(rowId, { status: 'error', error: message, columns });
      setDrafts((prev) => (prev[rowId] ? { ...prev, [rowId]: { ...prev[rowId], errors: { _row: message } } } : prev));
      opts.onEditError?.(error, candidate);
      return false;
    }
  }, [finish, setDrafts, setOverride, setSave]);

  const begin = useCallback(
    (rowId: string, columnId: string | undefined, initialValue: unknown, hasInitial: boolean) => {
      const opts = optionsRef.current;
      const table = opts.getTable();
      if (!opts.enabled || !table) return;
      let row: Row<TData>;
      try {
        row = table.getRow(rowId, true);
      } catch {
        return;
      }
      const editableColumns = table
        .getVisibleLeafColumns()
        .filter((c) => isCellEditable(row, c, opts.isRowEditable));
      if (editableColumns.length === 0) return;

      if (opts.mode === 'row') {
        const draft: Record<string, unknown> = {};
        for (const c of editableColumns) draft[c.id] = row.getValue(c.id);
        if (columnId && hasInitial) draft[columnId] = initialValue;
        setDrafts((prev) => ({ ...prev, [rowId]: { draft, errors: {}, validating: false } }));
        setActive({ rowId, columnId: columnId && editableColumns.some((c) => c.id === columnId) ? columnId : null });
        return;
      }
      const target = columnId ? editableColumns.find((c) => c.id === columnId) : editableColumns[0];
      if (!target) return;
      const value = hasInitial ? initialValue : row.getValue(target.id);
      setDrafts((prev) => ({ ...prev, [rowId]: { draft: { [target.id]: value }, errors: {}, validating: false } }));
      setActive({ rowId, columnId: target.id });
    },
    [setActive, setDrafts],
  );

  const startEditing = useCallback(
    (rowId: string, columnId?: string, ...rest: [initialValue?: unknown]) => {
      const hasInitial = rest.length > 0 && rest[0] !== undefined;
      const current = activeRef.current;
      if (current && optionsRef.current.mode === 'row' && current.rowId === rowId) {
        // Already editing this row: just move the focus target.
        setActive({ rowId, columnId: columnId ?? current.columnId });
        return;
      }
      if (current) {
        void commit().then((ok) => {
          if (ok) begin(rowId, columnId, rest[0], hasInitial);
        });
        return;
      }
      begin(rowId, columnId, rest[0], hasInitial);
    },
    [begin, commit, setActive],
  );

  const setDraftValue = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setDrafts((prev) => {
        const state = prev[rowId];
        if (!state) return prev;
        const errors = { ...state.errors };
        delete errors[columnId];
        delete errors._row;
        return { ...prev, [rowId]: { ...state, draft: { ...state.draft, [columnId]: value }, errors } };
      });
    },
    [setDrafts],
  );

  const cancel = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    if (saveRef.current[current.rowId]?.status === 'error') setSave(current.rowId, null);
    finish(current.rowId);
  }, [finish, setSave]);

  const isDirty = useCallback((rowId: string) => {
    const state = draftsRef.current[rowId];
    const table = optionsRef.current.getTable();
    if (!state || !table) return false;
    try {
      const row = table.getRow(rowId, true);
      return Object.entries(state.draft).some(([id, v]) => !shallowEqualValue(v, row.getValue(id)));
    } catch {
      return false;
    }
  }, []);

  const dismissSaveError = useCallback((rowId: string) => setSave(rowId, null), [setSave]);

  return useMemo(
    () => ({
      enabled: options.enabled,
      mode: options.mode,
      active,
      getActive: () => activeRef.current,
      drafts,
      saveStates,
      overrides,
      isCellEditable: checkCellEditable,
      startEditing,
      setDraftValue,
      commit,
      cancel,
      isDirty,
      dismissSaveError,
    }),
    [options.enabled, options.mode, active, drafts, saveStates, overrides, checkCellEditable, startEditing, setDraftValue, commit, cancel, isDirty, dismissSaveError],
  );
}

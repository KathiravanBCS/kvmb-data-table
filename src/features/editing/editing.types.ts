import type { ComponentType } from 'react';
import type { Row } from '@tanstack/react-table';
import type { FilterOption } from '../filtering/filter.types';

export type EditMode = 'cell' | 'row';

/** What activates editing. `manual` = only via the grid API / row action buttons. */
export type EditTrigger = 'doubleClick' | 'click' | 'manual';

export type BuiltInEditor = 'text' | 'number' | 'select' | 'multiSelect' | 'checkbox' | 'date' | 'datetime';

/** Result of a validator: an error message, or `null`/`undefined`/`true` when valid. */
export type ValidationResult = string | null | undefined | true;

export type CellValidator<TData, TValue = unknown> = (
  value: TValue,
  row: TData,
) => ValidationResult | Promise<ValidationResult>;

/** Props received by every cell editor (built-in or custom). */
export interface CellEditorProps<TData, TValue = unknown> {
  /** Current draft value. */
  value: TValue;
  /** Updates the draft value (does not commit). */
  onChange: (value: TValue) => void;
  /** Commits the current draft (runs validation, then persists). */
  onCommit: () => void;
  /** Discards the draft and leaves edit mode. */
  onCancel: () => void;
  row: Row<TData>;
  columnId: string;
  /** Validation error for this cell, if any. */
  error: string | null;
  /** True while an async validation or save for this row is in flight. */
  pending: boolean;
  /** Whether the editor should take focus when mounted. */
  autoFocus: boolean;
  /** Options configured through `meta.editorOptions`. */
  options: readonly FilterOption[];
  /** Accessible label (column header text). */
  label: string;
}

export type CellEditorComponent<TData, TValue = unknown> = ComponentType<CellEditorProps<TData, TValue>>;

export interface RowUpdateContext<TData> {
  rowId: string;
  /** The row as it was before the edit. */
  originalRow: TData;
  /** Changed values keyed by column id. */
  changes: Record<string, unknown>;
}

/**
 * Persists an edited row. Return (or resolve) nothing to accept `updatedRow` as-is,
 * or return the server's canonical row. Throw / reject to roll back.
 */
export type RowUpdateHandler<TData> = (
  updatedRow: TData,
  context: RowUpdateContext<TData>,
) => void | TData | Promise<void | TData>;

export type RowValidator<TData> = (
  row: TData,
) => Record<string, string> | null | undefined | Promise<Record<string, string> | null | undefined>;

export interface EditingCellRef {
  rowId: string;
  columnId: string;
}

export interface RowEditState {
  /** Draft values keyed by column id. */
  draft: Record<string, unknown>;
  /** Validation errors keyed by column id (`_row` for row-level errors). */
  errors: Record<string, string>;
  /** Async validation running. */
  validating: boolean;
}

export interface RowSaveState {
  status: 'saving' | 'error';
  error?: string;
}

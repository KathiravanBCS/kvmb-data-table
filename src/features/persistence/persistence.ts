import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  GroupingState,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import type { FilterGroup, FilterPreset } from '../filtering/filter.types';
import type { GridDensity } from '../../core/grid.types';

/** Pieces of grid state that can be persisted. */
export type PersistableStateKey =
  | 'sorting'
  | 'filterModel'
  | 'globalFilter'
  | 'filterPresets'
  | 'pagination'
  | 'columnVisibility'
  | 'columnOrder'
  | 'columnSizing'
  | 'columnPinning'
  | 'grouping'
  | 'density';

export interface PersistedGridState {
  sorting?: SortingState;
  filterModel?: FilterGroup;
  globalFilter?: string;
  filterPresets?: FilterPreset[];
  pagination?: PaginationState;
  columnVisibility?: VisibilityState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnPinning?: ColumnPinningState;
  grouping?: GroupingState;
  density?: GridDensity;
}

/** Minimal storage interface (compatible with `localStorage` / `sessionStorage`). */
export interface GridStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistStateOptions {
  /** Storage key. Use a unique key per grid. */
  key: string;
  /** `local` (default), `session`, or a custom storage implementation. */
  storage?: 'local' | 'session' | GridStateStorage;
  /** State to persist. Defaults to column layout, sorting, density and filter presets. */
  include?: readonly PersistableStateKey[];
  /** Bump to discard previously stored state after breaking changes. Default `1`. */
  version?: number;
}

export const DEFAULT_PERSISTED_KEYS: readonly PersistableStateKey[] = [
  'sorting',
  'columnVisibility',
  'columnOrder',
  'columnSizing',
  'columnPinning',
  'density',
  'filterPresets',
];

interface StoredEnvelope {
  v: number;
  state: PersistedGridState;
}

export function resolveStorage(storage: PersistStateOptions['storage']): GridStateStorage | null {
  if (storage && typeof storage === 'object') return storage;
  if (typeof window === 'undefined') return null;
  try {
    return storage === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    // Access can throw (e.g. disabled cookies / privacy mode).
    return null;
  }
}

export function loadPersistedState(options: PersistStateOptions | undefined): PersistedGridState {
  if (!options) return {};
  const storage = resolveStorage(options.storage);
  if (!storage) return {};
  try {
    const raw = storage.getItem(options.key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredEnvelope;
    if (!parsed || parsed.v !== (options.version ?? 1) || typeof parsed.state !== 'object') return {};
    const include = new Set(options.include ?? DEFAULT_PERSISTED_KEYS);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed.state)) if (include.has(k as PersistableStateKey)) out[k] = v;
    return out as PersistedGridState;
  } catch {
    return {};
  }
}

export function savePersistedState(options: PersistStateOptions, state: PersistedGridState): void {
  const storage = resolveStorage(options.storage);
  if (!storage) return;
  const include = options.include ?? DEFAULT_PERSISTED_KEYS;
  const picked: Record<string, unknown> = {};
  for (const key of include) if (state[key] !== undefined) picked[key] = state[key];
  try {
    storage.setItem(options.key, JSON.stringify({ v: options.version ?? 1, state: picked } satisfies StoredEnvelope));
  } catch {
    // Quota exceeded or storage unavailable: persistence is best-effort.
  }
}

export function clearPersistedState(options: PersistStateOptions): void {
  try {
    resolveStorage(options.storage)?.removeItem(options.key);
  } catch {
    /* ignore */
  }
}

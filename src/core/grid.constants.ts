import type { GridDensity } from './grid.types';

export const SELECT_COLUMN_ID = '__dg_select';
export const DRAG_COLUMN_ID = '__dg_drag';
export const ACTIONS_COLUMN_ID = '__dg_actions';

export const DEFAULT_ROW_HEIGHT: Record<GridDensity, number> = {
  compact: 32,
  standard: 42,
  comfortable: 54,
};

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_OVERSCAN = 8;
export const DEFAULT_GLOBAL_FILTER_DEBOUNCE = 250;

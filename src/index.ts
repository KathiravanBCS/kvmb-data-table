import './core/column-meta';

// Component & hooks
export { DataGrid } from './core/DataGrid';
export type { DataGridFactory } from './core/DataGrid';
export { useDataGrid } from './core/useDataGrid';
export type { DataGridContextValue } from './core/useDataGrid';
export { useDataGridContext, DataGridProvider } from './core/DataGridProvider';

// Types
export type {
  BulkActionsContext,
  ColumnLayout,
  DataGridApi,
  DataGridFeatureProps,
  DataGridProps,
  DataGridQuery,
  DataGridStylesNames,
  EmptyStateContext,
  GridDensity,
  GroupHeaderContext,
  RowReorderEvent,
} from './core/grid.types';
export type { ColumnAlign, DataGridColumnMeta } from './core/column-meta';
export { defaultLabels } from './core/grid.defaults';
export type { DataGridLabels } from './core/grid.defaults';

// Filtering
export type {
  BooleanFilterOperator,
  BuiltInFilterOperator,
  DateFilterOperator,
  FilterCondition,
  FilterGroup,
  FilterLogic,
  FilterNode,
  FilterOperator,
  FilterOperatorDefinition,
  FilterOption,
  FilterPreset,
  FilterValue,
  FilterValueInputKind,
  FilterVariant,
  NullFilterOperator,
  NumberFilterOperator,
  SetFilterOperator,
  TextFilterOperator,
} from './features/filtering/filter.types';
export {
  builtInFilterOperators,
  createOperatorRegistry,
  defaultOperatorByVariant,
  getOperatorsForVariant,
} from './features/filtering/filter.operators';
export type { FilterOperatorRegistry } from './features/filtering/filter.operators';
export {
  EMPTY_FILTER_MODEL,
  addFilterNode,
  applyFilterModel,
  createFilterCondition,
  createFilterGroup,
  evaluateFilterNode,
  flattenConditions,
  getActiveConditions,
  isConditionActive,
  pruneFilterModel,
  removeFilterNode,
  updateFilterNode,
} from './features/filtering/filter.model';
export { FilterBuilder } from './components/filters/FilterBuilder';
export type { FilterBuilderProps } from './components/filters/FilterBuilder';

// Editing
export type {
  BuiltInEditor,
  CellEditorComponent,
  CellEditorProps,
  CellValidator,
  EditMode,
  EditTrigger,
  RowUpdateContext,
  RowUpdateHandler,
  RowValidator,
  ValidationResult,
} from './features/editing/editing.types';
export {
  CheckboxEditor,
  DateEditor,
  DateTimeEditor,
  MultiSelectEditor,
  NumberEditor,
  SelectEditor,
  TextEditor,
} from './components/editors/editors';

// Persistence
export { clearPersistedState, loadPersistedState, savePersistedState } from './features/persistence/persistence';
export type {
  GridStateStorage,
  PersistableStateKey,
  PersistedGridState,
  PersistStateOptions,
} from './features/persistence/persistence';

// Server-side helpers
export { toServerQuery, toSearchParams } from './adapters/server';
export type { ServerQuery, ServerSortItem } from './adapters/server';

// Building blocks for custom toolbars
export { DataGridToolbar } from './components/toolbar/Toolbar';
export { GlobalSearch } from './components/toolbar/GlobalSearch';
export { ColumnManager } from './components/toolbar/ColumnManager';
export { FilterBuilderButton } from './components/toolbar/FilterBuilderButton';
export { FilterChips } from './components/toolbar/FilterChips';
export { DensityMenu, ExportMenu, GroupingBar, SelectionBar } from './components/toolbar/ToolbarMenus';
export { GridPagination } from './components/pagination/GridPagination';
export { DragHandle } from './features/drag-drop/DragHandle';

// Aggregation helpers
export { aggregationFns } from './features/aggregation/aggregation';

// Lightweight CSV export is part of the core; Excel lives in the `/export` entry.
export { exportToCsv, toCsv } from './export/csv';
export type { CsvExportOptions, CsvExportResult } from './export/csv';
export type { ExcelExportOptions, ExcelExportResult } from './export/excel';
export type { ExportColumnScope, ExportRowScope } from './export/shared';

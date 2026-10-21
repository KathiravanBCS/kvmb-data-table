/** User-facing strings. Override any subset through the `labels` prop. */
export interface DataGridLabels {
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearSearch: string;
  noRows: string;
  noResults: string;
  errorTitle: string;
  retry: string;
  loading: string;
  columns: string;
  showAllColumns: string;
  hideAllColumns: string;
  resetColumns: string;
  density: string;
  densityCompact: string;
  densityStandard: string;
  densityComfortable: string;
  filters: string;
  addFilter: string;
  addGroup: string;
  clearFilters: string;
  removeFilter: string;
  filterField: string;
  filterOperator: string;
  filterValue: string;
  filterMatchAll: string;
  filterMatchAny: string;
  filterPresets: string;
  savePreset: string;
  presetNamePlaceholder: string;
  deletePreset: string;
  noPresets: string;
  apply: string;
  cancel: string;
  save: string;
  edit: string;
  export: string;
  exportCsvFiltered: string;
  exportCsvSelected: string;
  exportExcelFiltered: string;
  exportExcelSelected: string;
  exporting: string;
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  hideColumn: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  groupBy: string;
  ungroup: string;
  groupedBy: string;
  columnActions: string;
  filterColumn: string;
  clearColumnFilter: string;
  selectRow: string;
  selectAllOnPage: string;
  selectedCount: (count: number) => string;
  selectAllFiltered: (count: number) => string;
  allFilteredSelected: (count: number) => string;
  clearSelection: string;
  rowsPerPage: string;
  pageInfo: (from: number, to: number, total: number) => string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  expandGroup: string;
  collapseGroup: string;
  expandAll: string;
  collapseAll: string;
  dragRow: string;
  dragColumn: string;
  resizeColumn: string;
  saving: string;
  saveFailed: string;
  rowActions: string;
  sortedAscending: (column: string) => string;
  sortedDescending: (column: string) => string;
  sortCleared: (column: string) => string;
  rowsAnnouncement: (count: number) => string;
  trueLabel: string;
  falseLabel: string;
  valueMin: string;
  valueMax: string;
  aggregateLabels: Record<string, string>;
}

export const defaultLabels: DataGridLabels = {
  searchPlaceholder: 'Search…',
  searchAriaLabel: 'Search all columns',
  clearSearch: 'Clear search',
  noRows: 'No rows to display',
  noResults: 'No rows match the current filters',
  errorTitle: 'Failed to load data',
  retry: 'Retry',
  loading: 'Loading…',
  columns: 'Columns',
  showAllColumns: 'Show all',
  hideAllColumns: 'Hide all',
  resetColumns: 'Reset columns',
  density: 'Density',
  densityCompact: 'Compact',
  densityStandard: 'Standard',
  densityComfortable: 'Comfortable',
  filters: 'Filters',
  addFilter: 'Add condition',
  addGroup: 'Add group',
  clearFilters: 'Clear all filters',
  removeFilter: 'Remove filter',
  filterField: 'Field',
  filterOperator: 'Operator',
  filterValue: 'Value',
  filterMatchAll: 'All (AND)',
  filterMatchAny: 'Any (OR)',
  filterPresets: 'Presets',
  savePreset: 'Save as preset',
  presetNamePlaceholder: 'Preset name',
  deletePreset: 'Delete preset',
  noPresets: 'No saved presets',
  apply: 'Apply',
  cancel: 'Cancel',
  save: 'Save',
  edit: 'Edit',
  export: 'Export',
  exportCsvFiltered: 'CSV – filtered rows',
  exportCsvSelected: 'CSV – selected rows',
  exportExcelFiltered: 'Excel – filtered rows',
  exportExcelSelected: 'Excel – selected rows',
  exporting: 'Exporting…',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  hideColumn: 'Hide column',
  pinLeft: 'Pin to left',
  pinRight: 'Pin to right',
  unpin: 'Unpin',
  groupBy: 'Group by this column',
  ungroup: 'Remove grouping',
  groupedBy: 'Grouped by',
  columnActions: 'Column actions',
  filterColumn: 'Filter column',
  clearColumnFilter: 'Clear filter',
  selectRow: 'Select row',
  selectAllOnPage: 'Select all rows on this page',
  selectedCount: (n) => `${n.toLocaleString()} selected`,
  selectAllFiltered: (n) => `Select all ${n.toLocaleString()} rows`,
  allFilteredSelected: (n) => `All ${n.toLocaleString()} rows are selected`,
  clearSelection: 'Clear selection',
  rowsPerPage: 'Rows per page',
  pageInfo: (from, to, total) => `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`,
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  expandGroup: 'Expand group',
  collapseGroup: 'Collapse group',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  dragRow: 'Drag to reorder row',
  dragColumn: 'Drag to reorder column',
  resizeColumn: 'Resize column',
  saving: 'Saving…',
  saveFailed: 'Save failed',
  rowActions: 'Row actions',
  sortedAscending: (c) => `Sorted by ${c}, ascending`,
  sortedDescending: (c) => `Sorted by ${c}, descending`,
  sortCleared: (c) => `Sorting removed from ${c}`,
  rowsAnnouncement: (n) => `${n.toLocaleString()} rows`,
  trueLabel: 'Yes',
  falseLabel: 'No',
  valueMin: 'Min',
  valueMax: 'Max',
  aggregateLabels: {
    sum: 'Sum',
    mean: 'Avg',
    min: 'Min',
    max: 'Max',
    count: 'Count',
    uniqueCount: 'Unique',
    median: 'Median',
  },
};

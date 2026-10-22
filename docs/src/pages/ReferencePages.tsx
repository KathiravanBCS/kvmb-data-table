import { List, Text } from '@mantine/core';
import { CodeBlock, Page, PropsTable, Section, type PropRow } from '../components/Doc';

const coreProps: PropRow[] = [
  { name: 'data', type: 'TData[]', description: 'Rows to display (for server-side mode, the current page).' },
  { name: 'columns', type: 'ColumnDef<TData>[]', description: 'TanStack column definitions, with grid options in meta.' },
  {
    name: 'getRowId',
    type: '(row, index, parent?) => string',
    default: 'row.id ?? index',
    description: 'Stable row id. Strongly recommended.',
  },
  { name: 'getSubRows', type: '(row, index) => TData[] | undefined', description: 'Tree data / server-provided groups.' },
  {
    name: 'height / maxHeight',
    type: 'number | string',
    description: 'Size of the scroll area. Needed for virtualization and sticky headers.',
  },
  {
    name: 'density',
    type: "'compact' | 'standard' | 'comfortable'",
    default: "'standard'",
    description: 'Row density (controlled). Use defaultDensity / onDensityChange.',
  },
  { name: 'rowHeight', type: 'number', default: '32 / 42 / 54', description: 'Fixed row height in px.' },
  { name: 'dynamicRowHeight', type: 'boolean', default: 'false', description: 'Measure each row (variable content).' },
  { name: 'wrapText', type: 'boolean', default: 'false', description: 'Wrap cell text instead of truncating it.' },
  { name: 'layoutMode', type: "'fill' | 'fixed'", default: "'fill'", description: 'Stretch unpinned columns, or use exact sizes.' },
  { name: 'striped / withColumnBorders / withRowBorders / withBorder / highlightOnHover', type: 'boolean', description: 'Visual options.' },
  { name: 'stickyHeader', type: 'boolean', default: 'true', description: 'Keep the header visible while scrolling.' },
  {
    name: 'showFooter',
    type: 'boolean',
    default: 'auto',
    description: 'Show the footer row (on automatically when columns define footer or footerAggregation).',
  },
  { name: 'loading', type: 'boolean', description: 'Shows skeleton rows (no data) or an overlay, and sets aria-busy.' },
  { name: 'error / onRetry / renderError', type: 'ReactNode | Error', description: 'Error state with an optional retry button.' },
  { name: 'renderEmpty', type: '({ filtered }) => ReactNode', description: 'Custom empty state.' },
  { name: 'labels', type: 'Partial<DataGridLabels>', description: 'Translatable UI strings.' },
  { name: 'apiRef', type: 'Ref<DataGridApi<TData>>', description: 'Imperative API (see below).' },
  { name: 'classNames / styles / className / style', type: 'Styles API', description: 'Mantine Styles API selectors.' },
  { name: 'tableOptions', type: 'Partial<TableOptions<TData>>', description: 'Escape hatch for extra TanStack options.' },
];

const featureProps: PropRow[] = [
  { name: 'enableSorting / enableMultiSort', type: 'boolean', default: 'true', description: 'Sorting.' },
  { name: 'sorting / defaultSorting / onSortingChange / manualSorting', type: 'SortingState', description: 'Sorting state.' },
  { name: 'enableFiltering', type: 'boolean', default: 'false', description: 'Column filters, search box and filter builder.' },
  {
    name: 'enableGlobalFilter / enableFilterBuilder',
    type: 'boolean',
    default: 'enableFiltering',
    description: 'Turn each filtering UI on or off.',
  },
  { name: 'filterModel / defaultFilterModel / onFilterModelChange', type: 'FilterGroup', description: 'Advanced filter model.' },
  {
    name: 'globalFilter / defaultGlobalFilter / onGlobalFilterChange / globalFilterDebounce',
    type: 'string / number',
    default: '250ms',
    description: 'Global search.',
  },
  { name: 'filterOperators', type: 'FilterOperatorDefinition[]', description: 'Custom operators.' },
  { name: 'filterPresets / defaultFilterPresets / onFilterPresetsChange', type: 'FilterPreset[]', description: 'Saved filter presets.' },
  { name: 'manualFiltering', type: 'boolean', description: 'Server-side filtering.' },
  { name: 'enablePagination', type: 'boolean', default: 'false', description: 'Pager.' },
  {
    name: 'pagination / defaultPagination / onPaginationChange / pageSizeOptions',
    type: 'PaginationState',
    default: '[10,25,50,100]',
    description: 'Pagination state.',
  },
  { name: 'manualPagination / rowCount', type: 'boolean / number', description: 'Server-side pagination.' },
  { name: 'enableRowSelection', type: 'boolean | (row) => boolean', description: 'Selection checkboxes.' },
  { name: 'selectionMode', type: "'single' | 'multiple'", default: "'multiple'", description: 'Radio or checkbox selection.' },
  {
    name: 'rowSelection / defaultRowSelection / onRowSelectionChange',
    type: 'RowSelectionState',
    description: 'Selection state, keyed by row id.',
  },
  {
    name: 'selectOnRowClick / renderBulkActions',
    type: 'boolean / (ctx) => ReactNode',
    description: 'Row-click selection and bulk actions.',
  },
  {
    name: 'enableHiding / enableColumnResizing / enableColumnOrdering / enableColumnPinning',
    type: 'boolean',
    description: 'Column management.',
  },
  {
    name: 'columnVisibility / columnOrder / columnSizing / columnPinning (+ default*, on*Change)',
    type: 'TanStack states',
    description: 'Controlled column states.',
  },
  { name: 'defaultColumn', type: 'Partial<ColumnDef>', description: 'Defaults merged into every column.' },
  { name: 'enableGrouping / grouping / defaultGrouping / onGroupingChange', type: 'GroupingState', description: 'Grouping.' },
  {
    name: 'expanded / defaultExpanded / onExpandedChange / manualGrouping / renderGroupHeader',
    type: '…',
    description: 'Group expansion and custom group headers.',
  },
  {
    name: 'enableEditing / editMode / editTrigger',
    type: "boolean / 'cell' | 'row' / 'doubleClick' | 'click' | 'manual'",
    description: 'Inline editing.',
  },
  {
    name: 'onRowUpdate / validateRow / isRowEditable / optimisticUpdates / onEditError',
    type: '…',
    description: 'Persistence and validation of edits.',
  },
  { name: 'enableRowDragging / onRowReorder / canDragRow', type: '…', description: 'Row drag and drop.' },
  { name: 'enableVirtualization / overscan', type: 'boolean / number', default: '8', description: 'Row virtualization.' },
  { name: 'enableExport / onExportError', type: 'boolean', description: 'Export menu in the toolbar.' },
  { name: 'enableToolbar / enableDensityToggle / renderToolbar / toolbarActions', type: '…', description: 'Toolbar customisation.' },
  { name: 'enableKeyboardNavigation', type: 'boolean', default: 'true', description: 'Arrow-key cell navigation.' },
  {
    name: 'onQueryChange',
    type: '(query: DataGridQuery) => void',
    description: 'Server-relevant state changes (fires on mount and on every change).',
  },
  { name: 'persistState', type: 'PersistStateOptions', description: 'Persist state in storage.' },
  {
    name: 'getRowClassName / getRowStyle / onRowClick / onRowDoubleClick',
    type: '(row) => …',
    description: 'Row customisation and events.',
  },
];

export function ApiPage() {
  return (
    <Page title="API reference" intro="Everything exported from @kvmb/react-data-grid and @kvmb/react-data-grid/export.">
      <Section title="<DataGrid> – core props">
        <PropsTable rows={coreProps} />
      </Section>
      <Section title="<DataGrid> – feature props">
        <PropsTable rows={featureProps} />
      </Section>
      <Section title="DataGridApi (apiRef)">
        <CodeBlock
          code={`interface DataGridApi<TData> {
  table: Table<TData>;                      // TanStack table instance
  getSelectedRows(): Row<TData>[];
  clearSelection(): void;
  selectAllFiltered(): void;
  getFilterModel(): FilterGroup;
  setFilterModel(model: FilterGroup): void;
  clearFilters(): void;
  setGlobalFilter(value: string): void;
  resetSorting(): void;
  getColumnLayout(): ColumnLayout;
  setColumnLayout(layout: Partial<ColumnLayout>): void;
  resetColumnLayout(): void;
  startEditing(rowId: string, columnId?: string): void;
  commitEditing(): Promise<boolean>;
  cancelEditing(): void;
  scrollToRow(index: number): void;
  focusCell(rowIndex: number, columnId: string): void;
  exportCsv(options?: CsvExportOptions<TData>): CsvExportResult;
  exportExcel(options?: ExcelExportOptions<TData>): Promise<ExcelExportResult>;
}`}
        />
      </Section>
      <Section title="Other exports">
        <List size="sm">
          <List.Item>
            <b>Hooks / context:</b> <code>useDataGrid</code>, <code>useDataGridContext</code> (inside custom cells or toolbars),{' '}
            <code>DataGridProvider</code>.
          </List.Item>
          <List.Item>
            <b>Toolbar building blocks:</b> <code>DataGridToolbar</code>, <code>GlobalSearch</code>, <code>FilterBuilderButton</code>,{' '}
            <code>FilterChips</code>, <code>ColumnManager</code>, <code>DensityMenu</code>, <code>ExportMenu</code>,{' '}
            <code>GroupingBar</code>, <code>SelectionBar</code>, <code>GridPagination</code>, <code>DragHandle</code>,{' '}
            <code>FilterBuilder</code>.
          </List.Item>
          <List.Item>
            <b>Filtering:</b> <code>createFilterGroup</code>, <code>createFilterCondition</code>, <code>addFilterNode</code>,{' '}
            <code>updateFilterNode</code>, <code>removeFilterNode</code>, <code>pruneFilterModel</code>, <code>flattenConditions</code>,{' '}
            <code>getActiveConditions</code>, <code>isConditionActive</code>, <code>evaluateFilterNode</code>, <code>applyFilterModel</code>
            , <code>createOperatorRegistry</code>, <code>builtInFilterOperators</code>, <code>getOperatorsForVariant</code>,{' '}
            <code>defaultOperatorByVariant</code>, <code>EMPTY_FILTER_MODEL</code>.
          </List.Item>
          <List.Item>
            <b>Editors:</b> <code>TextEditor</code>, <code>NumberEditor</code>, <code>SelectEditor</code>, <code>MultiSelectEditor</code>,{' '}
            <code>CheckboxEditor</code>, <code>DateEditor</code>, <code>DateTimeEditor</code>.
          </List.Item>
          <List.Item>
            <b>Server:</b> <code>toServerQuery</code>, <code>toSearchParams</code>. <b>Persistence:</b> <code>loadPersistedState</code>,{' '}
            <code>savePersistedState</code>, <code>clearPersistedState</code>.
          </List.Item>
          <List.Item>
            <b>Export:</b> <code>exportToCsv</code>, <code>toCsv</code> (core); <code>exportToExcel</code>, <code>sanitizeSheetName</code>,{' '}
            <code>escapeCsvCell</code>, <code>formatCsvValue</code>, <code>resolveExportRows</code>, <code>resolveExportColumns</code>,{' '}
            <code>downloadBlob</code> (<code>/export</code>).
          </List.Item>
          <List.Item>
            <b>Misc:</b> <code>aggregationFns</code>, <code>defaultLabels</code>, and all the public types (<code>DataGridProps</code>,{' '}
            <code>DataGridColumnMeta</code>, <code>FilterGroup</code>, <code>CellEditorProps</code>, <code>RowUpdateHandler</code>, …).
          </List.Item>
        </List>
      </Section>
    </Page>
  );
}

export function TroubleshootingPage() {
  return (
    <Page title="Troubleshooting">
      <Section title="The grid has no styles">
        <Text size="sm">
          Import <code>@mantine/core/styles.css</code>, <code>@mantine/dates/styles.css</code> and{' '}
          <code>@kvmb/react-data-grid/styles.css</code>, in that order.
        </Text>
      </Section>
      <Section title="Virtualization renders every row">
        <Text size="sm">
          Virtualization needs a scroll area: set <code>height</code> or <code>maxHeight</code>. Without one, the grid logs a warning and
          renders all rows.
        </Text>
      </Section>
      <Section title="Selection or edits jump to other rows after refreshing data">
        <Text size="sm">
          Provide <code>getRowId</code>. Index-based ids change whenever the data is re-ordered or re-fetched.
        </Text>
      </Section>
      <Section title="An editable column stays read-only">
        <Text size="sm">
          Columns that use <code>accessorFn</code> need <code>meta.setValue</code>. Also check <code>meta.editable</code>,{' '}
          <code>isRowEditable</code> and <code>enableEditing</code>.
        </Text>
      </Section>
      <Section title="Excel export fails with “requires the optional peer dependency exceljs”">
        <Text size="sm">
          Run <code>npm install exceljs</code>. It is loaded on demand only when you export.
        </Text>
      </Section>
      <Section title="Multiple copies of React or Mantine">
        <Text size="sm">
          React, Mantine and dayjs are peer dependencies. Make sure your app installs compatible versions (React 19, Mantine 8.3) and that
          your bundler is not aliasing a second copy.
        </Text>
      </Section>
      <Section title="Next.js App Router">
        <Text size="sm">
          The package entry points include the <code>'use client'</code> directive, so you can import <code>DataGrid</code> from Server
          Components and it renders as a client component.
        </Text>
      </Section>
    </Page>
  );
}

export function MigrationPage() {
  return (
    <Page title="Migration guides">
      <Section title="From a plain TanStack Table + Mantine Table setup">
        <List size="sm">
          <List.Item>
            Keep your <code>ColumnDef</code>s as they are. Move rendering-related options into <code>meta</code> (<code>align</code>,{' '}
            <code>format</code>, <code>filterVariant</code>).
          </List.Item>
          <List.Item>
            Replace the controlled state you passed to <code>useReactTable</code> with the matching grid props (<code>sorting</code>/
            <code>onSortingChange</code>, …). Their types are the TanStack types you already use.
          </List.Item>
          <List.Item>
            Column filters become the <code>FilterGroup</code> model. Convert existing <code>columnFilters</code> with{' '}
            <code>createFilterCondition(id, operator, value)</code>.
          </List.Item>
          <List.Item>
            Use <code>apiRef.current.table</code> to reach the underlying TanStack instance.
          </List.Item>
        </List>
      </Section>
      <Section title="From mantine-react-table">
        <List size="sm">
          <List.Item>
            <code>MRT_ColumnDef</code> → TanStack <code>ColumnDef</code>; <code>Cell</code> → <code>cell</code>;{' '}
            <code>mantineTableBodyCellProps</code> → <code>meta.cellClassName</code>/<code>meta.cellStyle</code>.
          </List.Item>
          <List.Item>
            <code>enableRowVirtualization</code> → <code>enableVirtualization</code>; <code>enableEditing</code> and{' '}
            <code>editDisplayMode</code> → <code>enableEditing</code> and <code>editMode</code>.
          </List.Item>
          <List.Item>
            <code>renderTopToolbarCustomActions</code> → <code>toolbarActions</code>; <code>renderToolbarAlertBannerContent</code> →{' '}
            <code>renderBulkActions</code>.
          </List.Item>
        </List>
      </Section>
      <Section title="Versioning">
        <Text size="sm">
          The package follows semantic versioning. Breaking changes are listed in the CHANGELOG, together with migration notes.
        </Text>
      </Section>
    </Page>
  );
}

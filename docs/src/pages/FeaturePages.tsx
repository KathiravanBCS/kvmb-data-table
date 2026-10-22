import { Alert, List, Table, Text } from '@mantine/core';
import { CodeBlock, Demo, Kbd, Page, Section } from '../components/Doc';

import ColumnsDemo from '../../../examples/demos/ColumnsDemo';
import columnsCode from '../../../examples/demos/ColumnsDemo.tsx?raw';
import SortingDemo from '../../../examples/demos/SortingDemo';
import sortingCode from '../../../examples/demos/SortingDemo.tsx?raw';
import FilteringDemo from '../../../examples/demos/FilteringDemo';
import filteringCode from '../../../examples/demos/FilteringDemo.tsx?raw';
import PaginationDemo from '../../../examples/demos/PaginationDemo';
import paginationCode from '../../../examples/demos/PaginationDemo.tsx?raw';
import EditingDemo from '../../../examples/demos/EditingDemo';
import editingCode from '../../../examples/demos/EditingDemo.tsx?raw';
import GroupingDemo from '../../../examples/demos/GroupingDemo';
import groupingCode from '../../../examples/demos/GroupingDemo.tsx?raw';
import VirtualizationDemo from '../../../examples/demos/VirtualizationDemo';
import virtualizationCode from '../../../examples/demos/VirtualizationDemo.tsx?raw';
import SelectionDemo from '../../../examples/demos/SelectionDemo';
import selectionCode from '../../../examples/demos/SelectionDemo.tsx?raw';
import ColumnManagementDemo from '../../../examples/demos/ColumnManagementDemo';
import columnManagementCode from '../../../examples/demos/ColumnManagementDemo.tsx?raw';
import DragDropDemo from '../../../examples/demos/DragDropDemo';
import dragDropCode from '../../../examples/demos/DragDropDemo.tsx?raw';
import ExportDemo from '../../../examples/demos/ExportDemo';
import exportCode from '../../../examples/demos/ExportDemo.tsx?raw';
import ServerSideDemo from '../../../examples/demos/ServerSideDemo';
import serverCode from '../../../examples/demos/ServerSideDemo.tsx?raw';
import serviceCode from '../../../examples/server/employees.service.ts?raw';
import controllerCode from '../../../examples/server/nest-controller.example.ts.txt?raw';
import ThemeDemo from '../../../examples/demos/ThemeDemo';
import themeCode from '../../../examples/demos/ThemeDemo.tsx?raw';
import PersistenceDemo from '../../../examples/demos/PersistenceDemo';
import persistenceCode from '../../../examples/demos/PersistenceDemo.tsx?raw';
import columnsSharedCode from '../../../examples/columns.tsx?raw';

export function ColumnsPage() {
  return (
    <Page
      title="Column definitions"
      intro="Columns are standard TanStack Table column definitions. Grid-specific behaviour is configured through the typed meta object."
    >
      <Demo component={ColumnsDemo} code={columnsCode} />
      <Section title="Column meta reference">
        <Table withTableBorder striped fz="sm">
          <Table.Tbody>
            {[
              ['align', "'left' | 'center' | 'right'", 'Header/cell alignment (number filters default to right).'],
              [
                'filterVariant',
                "'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiSelect'",
                'Chooses filter operators and inputs, the default editor and Excel date handling.',
              ],
              [
                'filterOptions / editorOptions',
                '{ value, label }[]',
                'Options for select-like filters and editors. Derived from the data when omitted.',
              ],
              ['format', '(value, row) => ReactNode', 'Formats values when no cell renderer is given.'],
              ['cellClassName / cellStyle', 'string | (cell) => …', 'Conditional cell styling.'],
              ['wrap', 'boolean', 'Wrap text in this column (combine with dynamicRowHeight).'],
              ['editable / editor / validate / setValue / parseValue', '…', 'See Inline editing.'],
              ['locked', 'boolean', 'The column cannot be hidden or reordered.'],
              [
                'footerAggregation / formatAggregate',
                'boolean / (value) => ReactNode',
                'Show the aggregationFn result over the filtered rows in the footer.',
              ],
              ['exportValue / exportHeader / exportable / excelNumberFormat', '…', 'See Export.'],
            ].map(([k, t, d]) => (
              <Table.Tr key={k}>
                <Table.Td>
                  <code>{k}</code>
                </Table.Td>
                <Table.Td>
                  <code>{t}</code>
                </Table.Td>
                <Table.Td>{d}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="sm">
          Standard TanStack options work as usual, including <code>size</code>, <code>minSize</code>, <code>maxSize</code>,{' '}
          <code>enableSorting</code>, <code>enableHiding</code>, <code>enableResizing</code>, <code>enablePinning</code>,{' '}
          <code>enableGrouping</code>, <code>enableColumnFilter</code>, <code>enableGlobalFilter</code>, <code>sortingFn</code>,{' '}
          <code>aggregationFn</code>, <code>aggregatedCell</code>, <code>footer</code> and column groups (<code>columns: [...]</code>).
        </Text>
        <Text size="sm">
          Nested <code>accessorKey</code>s such as <code>'location.city'</code> are supported. The column id becomes{' '}
          <code>location_city</code>.
        </Text>
      </Section>
      <Section title="Shared column set used by the demos">
        <CodeBlock code={columnsSharedCode} />
      </Section>
    </Page>
  );
}

export function SortingPage() {
  return (
    <Page title="Sorting" intro="Single and multi-column sorting, controlled or uncontrolled, client- or server-side.">
      <Demo component={SortingDemo} code={sortingCode} />
      <List size="sm">
        <List.Item>
          Click a header to cycle ascending → descending → unsorted. <Kbd>Shift</Kbd>+click (or <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd>) adds a
          secondary sort.
        </List.Item>
        <List.Item>
          Use <code>defaultSorting</code> for an initial sort, or <code>sorting</code> + <code>onSortingChange</code> to control it.
        </List.Item>
        <List.Item>
          Custom comparators: set <code>sortingFn</code> on a column (a function or a TanStack built-in name).
        </List.Item>
        <List.Item>
          <code>manualSorting</code> turns off local sorting. The state is reported through <code>onSortingChange</code> /{' '}
          <code>onQueryChange</code>.
        </List.Item>
        <List.Item>
          Sort changes are announced to screen readers, and headers expose <code>aria-sort</code>.
        </List.Item>
        <List.Item>
          Reset sorting with <code>apiRef.current.resetSorting()</code>.
        </List.Item>
      </List>
    </Page>
  );
}

export function FilteringPage() {
  return (
    <Page
      title="Advanced filtering"
      intro="Global search, per-column quick filters, a visual AND/OR filter builder with nested groups, filter chips and saved presets, all driven by one serializable filter model."
    >
      <Demo component={FilteringDemo} code={filteringCode} />
      <Section title="The filter model">
        <CodeBlock
          code={`type FilterNode = FilterCondition | FilterGroup;

interface FilterGroup { type: 'group'; id: string; logic: 'and' | 'or'; children: FilterNode[] }
interface FilterCondition {
  type: 'condition';
  id: string;
  field: string;          // column id
  operator: FilterOperator;
  value?: string | number | boolean | null | Array<string | number | boolean | null>;
}`}
        />
        <Text size="sm">
          The model is plain JSON. Dates are stored as <code>YYYY-MM-DD</code> strings and ranges as <code>[min, max]</code> tuples, so you
          can send it to an API or put it in a URL unchanged. Conditions without a usable value are ignored, so half-finished rows in the
          builder never hide data.
        </Text>
      </Section>
      <Section title="Operators">
        <Table withTableBorder fz="sm">
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>text</Table.Td>
              <Table.Td>contains, notContains, equals, notEquals, startsWith, endsWith</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>number</Table.Td>
              <Table.Td>eq, neq, gt, gte, lt, lte, between</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>date</Table.Td>
              <Table.Td>on, notOn, before, after, onOrBefore, onOrAfter, dateBetween</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>boolean</Table.Td>
              <Table.Td>isTrue, isFalse</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>select / multiSelect</Table.Td>
              <Table.Td>in, notIn</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>all</Table.Td>
              <Table.Td>isEmpty, isNotEmpty</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        <Text size="sm">
          Add custom operators with the <code>filterOperators</code> prop. Each one is a <code>FilterOperatorDefinition</code> with an id, a
          label, the variants it applies to, its input kind and a predicate. Predicates are ordinary functions: no <code>eval</code> or
          dynamic code execution is used anywhere.
        </Text>
      </Section>
      <Section title="Helpers">
        <CodeBlock
          code={`import { applyFilterModel, createOperatorRegistry, createFilterGroup, createFilterCondition } from '@kvmb/react-data-grid';

// Works in Node.js too, e.g. for a simple in-memory API:
const rows = applyFilterModel(data, model, createOperatorRegistry(), (row, field) => row[field]);`}
        />
      </Section>
    </Page>
  );
}

export function PaginationPage() {
  return (
    <Page title="Pagination" intro="Client-side or server-side pagination with page navigation, a page-size selector and row counts.">
      <Demo component={PaginationDemo} code={paginationCode} />
      <List size="sm">
        <List.Item>
          <code>enablePagination</code> shows the pager. Control it with <code>pagination</code> / <code>onPaginationChange</code>, or set
          initial values with <code>defaultPagination</code>.
        </List.Item>
        <List.Item>
          Server-side: combine <code>manualPagination</code> and <code>rowCount</code> (the server total). Pass only the current page's rows
          as <code>data</code>.
        </List.Item>
        <List.Item>Sorting, filtering and search reset to the first page. If the data shrinks, the page index is clamped.</List.Item>
        <List.Item>
          Pass <code>loading</code> while a page request is in flight. The pager shows a loader and is disabled in manual mode.
        </List.Item>
      </List>
    </Page>
  );
}

export function EditingPage() {
  return (
    <Page
      title="Inline editing"
      intro="Cell or full-row editing with built-in Mantine editors, sync and async validation, dirty tracking and optimistic updates with rollback."
    >
      <Demo component={EditingDemo} code={editingCode} />
      <Section title="API">
        <CodeBlock
          code={`<DataGrid
  data={data}
  columns={columns}
  enableEditing
  editMode="cell"                 // or "row" (adds Save / Cancel actions)
  editTrigger="doubleClick"       // "click" | "manual"
  isRowEditable={(row) => !row.archived}
  validateRow={async (row) => (await api.isUnique(row.email) ? null : { email: 'Already taken' })}
  onRowUpdate={async (updatedRow, { rowId, originalRow, changes }) => {
    const saved = await api.update(updatedRow); // throw to roll back
    return saved;                               // optional: canonical server row
  }}
  onEditError={(error, row) => notifications.show({ message: String(error) })}
/>`}
        />
        <Table withTableBorder fz="sm">
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Built-in editors</Table.Td>
              <Table.Td>
                <code>text</code>, <code>number</code>, <code>select</code>, <code>multiSelect</code>, <code>checkbox</code>,{' '}
                <code>date</code>, <code>datetime</code>. The default is derived from <code>filterVariant</code>.
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Custom editors</Table.Td>
              <Table.Td>
                <code>meta.editor: MyEditor</code> receives <code>CellEditorProps</code> (<code>value</code>, <code>onChange</code>,{' '}
                <code>onCommit</code>, <code>onCancel</code>, <code>error</code>, <code>pending</code>, …).
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Validation</Table.Td>
              <Table.Td>
                <code>meta.validate(value, row)</code> (sync or async, returns a message or null) and the grid-level{' '}
                <code>validateRow</code>.
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Writing values</Table.Td>
              <Table.Td>
                <code>accessorKey</code> columns, including nested paths, are written immutably. <code>accessorFn</code> columns need{' '}
                <code>meta.setValue</code>, otherwise they are read-only.
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Keyboard</Table.Td>
              <Table.Td>
                <Kbd>Enter</Kbd>/<Kbd>F2</Kbd> or typing starts editing; <Kbd>Enter</Kbd> commits; <Kbd>Esc</Kbd> cancels; <Kbd>Tab</Kbd>/
                <Kbd>Shift+Tab</Kbd> commit and move (cell mode). Clicking outside commits.
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Programmatic</Table.Td>
              <Table.Td>
                <code>apiRef.current.startEditing(rowId, columnId?)</code>, <code>commitEditing()</code>, <code>cancelEditing()</code>.
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Section>
      <Section title="Saving, failures and stale data">
        <List size="sm">
          <List.Item>
            <b>Optimistic (default):</b> the edited value shows immediately and the cell displays a saving indicator. If{' '}
            <code>onRowUpdate</code> rejects, the row rolls back and shows an error icon with the message.
          </List.Item>
          <List.Item>
            <b>Pessimistic</b> (<code>optimisticUpdates=&#123;false&#125;</code>): the editor stays open and disabled until the promise
            resolves. On failure the error is shown and the draft is kept, so the user can retry or cancel.
          </List.Item>
          <List.Item>
            The <code>data</code> prop is always the source of truth. Optimistic overrides are dropped as soon as new data arrives, so
            update your state with the saved row (as in the demo).
          </List.Item>
          <List.Item>
            If the data changes while a row is being edited, the draft is kept and applied to the latest version of the row when it is
            committed. If the row disappears, the edit is discarded.
          </List.Item>
          <List.Item>
            Optimistic overrides apply to top-level rows. For tree data (<code>getSubRows</code>), update <code>data</code> in{' '}
            <code>onRowUpdate</code>.
          </List.Item>
        </List>
      </Section>
    </Page>
  );
}

export function GroupingPage() {
  return (
    <Page
      title="Grouping & aggregation"
      intro="Group by one or many columns with expandable groups, counts, aggregated cells and aggregate footers."
    >
      <Demo component={GroupingDemo} code={groupingCode} />
      <List size="sm">
        <List.Item>
          Users can group from the column menu ("Group by this column") and remove groups with the chips in the toolbar. Control grouping
          with <code>grouping</code> / <code>onGroupingChange</code>.
        </List.Item>
        <List.Item>Groups are sorted by the active sorting, and grouped columns move to the front.</List.Item>
        <List.Item>
          Aggregations use <code>aggregationFn</code>:{' '}
          <code>'sum' | 'mean' | 'min' | 'max' | 'count' | 'uniqueCount' | 'median' | 'extent'</code>, the exported{' '}
          <code>aggregationFns</code> helpers (<code>aggregationFns.avg</code>, …), or any custom{' '}
          <code>(columnId, leafRows, childRows) =&gt; value</code> function.
        </List.Item>
        <List.Item>
          Render aggregated values in group rows with <code>aggregatedCell</code>, and in the footer with{' '}
          <code>meta.footerAggregation</code> (computed over all filtered rows).
        </List.Item>
        <List.Item>
          Custom group rows: <code>renderGroupHeader=&#123;(&#123; row, columnId, value, count &#125;) =&gt; …&#125;</code>.
        </List.Item>
      </List>
      <Alert variant="light" title="Client-side vs server-provided groups">
        <Text size="sm">
          Client-side grouping groups the rows already loaded into the grid. If your server returns groups, pass hierarchical data with{' '}
          <code>getSubRows</code> and <code>manualGrouping</code>. The grid then renders the tree as it is, without regrouping it.
        </Text>
      </Alert>
    </Page>
  );
}

export function VirtualizationPage() {
  return (
    <Page title="Virtualization" intro="Row virtualization with TanStack Virtual keeps the DOM small, even with 100,000 rows.">
      <Demo component={VirtualizationDemo} code={virtualizationCode} />
      <List size="sm">
        <List.Item>
          Set <code>enableVirtualization</code> and a <code>height</code> or <code>maxHeight</code>. Only visible rows plus{' '}
          <code>overscan</code> (default 8) are rendered.
        </List.Item>
        <List.Item>
          Rows have a fixed height (<code>rowHeight</code>, which defaults to the density). Use <code>dynamicRowHeight</code> or{' '}
          <code>wrapText</code> to measure each row instead.
        </List.Item>
        <List.Item>
          Selection, editing, keyboard navigation (rows scroll into view), sticky headers, pinned columns and grouping all work with
          virtualization.
        </List.Item>
        <List.Item>
          Rows are memoized, so a row re-renders only when its data, selection, focus, edit state or the column layout changes.
        </List.Item>
        <List.Item>
          Restore a scroll position with <code>apiRef.current.scrollToRow(index)</code>.
        </List.Item>
      </List>
      <Text size="sm" c="dimmed">
        See the README for measured benchmark numbers (<code>npm run bench</code>).
      </Text>
    </Page>
  );
}

export function SelectionPage() {
  return (
    <Page title="Row selection" intro="Checkbox or radio selection with bulk actions, per-row rules and stable row ids.">
      <Demo component={SelectionDemo} code={selectionCode} />
      <List size="sm">
        <List.Item>
          <code>enableRowSelection</code> takes <code>true</code> or <code>(row) =&gt; boolean</code> to disable individual rows. Use{' '}
          <code>selectionMode="single"</code> for radios.
        </List.Item>
        <List.Item>
          The header checkbox selects every row on the current page (or every filtered row when pagination is off). A "Select all N rows"
          link then extends the selection to all filtered rows.
        </List.Item>
        <List.Item>
          <code>selectOnRowClick</code> toggles a row when it is clicked; <Kbd>Space</Kbd> toggles the focused row and <Kbd>Ctrl/⌘+A</Kbd>{' '}
          selects all.
        </List.Item>
        <List.Item>
          <code>renderBulkActions</code> renders actions in the toolbar while rows are selected.
        </List.Item>
      </List>
      <Alert variant="light" title="Selection with paginated or server data">
        <Text size="sm">
          Selection is stored as <code>{'{ [rowId]: true }'}</code>, so it survives sorting, filtering and page changes as long as row ids
          are stable (use <code>getRowId</code>). In server mode, ids of rows on other pages stay selected, but{' '}
          <code>getSelectedRows()</code> can only return rows that are currently loaded. Keep your own id-to-row map if you need the full
          objects. "Select all filtered" only covers loaded rows. Use your API to act on "all rows matching this query".
        </Text>
      </Alert>
    </Page>
  );
}

export function ColumnManagementPage() {
  return (
    <Page title="Column management" intro="Visibility, resizing, reordering, pinning, locking and saved layouts.">
      <Demo component={ColumnManagementDemo} code={columnManagementCode} />
      <List size="sm">
        <List.Item>
          <b>Visibility:</b> the toolbar "Columns" panel (show/hide all, reset) and the column menu's "Hide column".
        </List.Item>
        <List.Item>
          <b>Resizing</b> (<code>enableColumnResizing</code>): drag the header edge, double-click it to reset, or press <Kbd>Alt</Kbd>+
          <Kbd>←</Kbd>/<Kbd>→</Kbd> on a focused header. <code>minSize</code>/<code>maxSize</code> are respected.
        </List.Item>
        <List.Item>
          <b>Reordering</b> (<code>enableColumnOrdering</code>): drag header handles or reorder in the Columns panel. Both work with pointer
          and keyboard.
        </List.Item>
        <List.Item>
          <b>Pinning</b> (<code>enableColumnPinning</code>): pin left or right from the column menu. Pinned columns are sticky while
          scrolling horizontally.
        </List.Item>
        <List.Item>
          <b>Locking:</b> <code>meta.locked</code> columns cannot be hidden or moved.
        </List.Item>
        <List.Item>
          <b>Layouts:</b> <code>getColumnLayout()</code>, <code>setColumnLayout()</code> and <code>resetColumnLayout()</code> on the API, or
          automatic persistence with <code>persistState</code>.
        </List.Item>
        <List.Item>
          <code>layoutMode="fill"</code> (default) stretches unpinned columns to fill the width; <code>"fixed"</code> uses exact sizes.
        </List.Item>
      </List>
    </Page>
  );
}

export function DragDropPage() {
  return (
    <Page title="Drag & drop" intro="Row and column reordering with dnd-kit, including keyboard drag and drop.">
      <Demo component={DragDropDemo} code={dragDropCode} />
      <List size="sm">
        <List.Item>
          Rows: set <code>enableRowDragging</code> and handle{' '}
          <code>onRowReorder(&#123; rowId, fromIndex, toIndex, reorderedData &#125;)</code>. The grid never changes your data itself.
        </List.Item>
        <List.Item>
          Use <code>canDragRow</code> to restrict which rows can be dragged. Dragging is turned off while the grid is sorted, grouped or
          editing, because the visual order then differs from the data order.
        </List.Item>
        <List.Item>Drags only start from the handle, so clicks used for selection or editing never start a drag.</List.Item>
        <List.Item>
          Keyboard: focus a handle, press <Kbd>Space</Kbd> to pick it up, move it with the arrow keys, press <Kbd>Space</Kbd> to drop or{' '}
          <Kbd>Esc</Kbd> to cancel. Screen readers hear the dnd-kit announcements.
        </List.Item>
        <List.Item>
          The list auto-scrolls while you drag. With virtualization, rows can only be dropped onto rows that are currently rendered.
        </List.Item>
      </List>
    </Page>
  );
}

export function ExportPage() {
  return (
    <Page
      title="CSV & Excel export"
      intro="Lightweight CSV export in the core, and an Excel (.xlsx) exporter in a separate entry point that loads ExcelJS on demand."
    >
      <Demo component={ExportDemo} code={exportCode} />
      <Section title="CSV">
        <CodeBlock
          code={`import { exportToCsv } from '@kvmb/react-data-grid'; // or apiRef.current.exportCsv(options)

exportToCsv(api.table, {
  rows: 'filtered',      // 'all' | 'filtered' | 'selected' | 'page'
  columns: 'visible',    // 'visible' | 'all' | ['name', 'salary']
  filename: 'people.csv',
  delimiter: ',',
  bom: true,             // UTF-8 BOM so Excel detects the encoding
  escapeFormulas: true,  // neutralises =, +, -, @ formula injection
  getHeader: (column) => column.id.toUpperCase(),
});`}
        />
      </Section>
      <Section title="Excel">
        <CodeBlock
          code={`import { exportToExcel } from '@kvmb/react-data-grid/export';

await exportToExcel(api.table, {
  filename: 'report.xlsx',
  sheetName: 'People',
  headerStyle: { bold: true, fillColor: '#228BE6', fontColor: '#FFFFFF' },
  columnWidths: 'grid',   // from the grid's column sizes; or 'auto' / { [columnId]: width }
  dateFormat: 'yyyy-mm-dd',
  autoFilter: true,
  onProgress: ({ phase, progress }) => setProgress(progress),
});`}
        />
        <List size="sm">
          <List.Item>
            <code>exceljs</code> is an optional peer dependency, loaded with a dynamic <code>import()</code> the first time you export. It
            is not part of the core bundle.
          </List.Item>
          <List.Item>
            Per-column options: <code>meta.excelNumberFormat</code>, <code>meta.exportValue</code>, <code>meta.exportHeader</code>,{' '}
            <code>meta.exportable: false</code>. Date-variant columns become real Excel dates.
          </List.Item>
          <List.Item>
            Multiple sheets: pass <code>sheets</code> with grid sheets (<code>&#123; name, rows, columns &#125;</code>) and raw sheets (
            <code>&#123; name, columns, data &#125;</code>).
          </List.Item>
        </List>
      </Section>
      <Alert variant="light" color="yellow" title="Server-side data">
        <Text size="sm">
          Exports only include rows that are loaded in the grid. To export a full server-side dataset, fetch it first or use a dedicated
          export endpoint on your server.
        </Text>
      </Alert>
    </Page>
  );
}

export function ServerSidePage() {
  return (
    <Page
      title="Server-side integration"
      intro="Manual pagination, sorting and filtering for REST, GraphQL or NestJS backends, with no fetch library required."
    >
      <Demo component={ServerSideDemo} code={serverCode} />
      <List size="sm">
        <List.Item>
          Turn on <code>manualPagination</code>, <code>manualSorting</code> and <code>manualFiltering</code>, pass <code>rowCount</code>,
          and fetch in <code>onQueryChange</code>. It fires on mount and on every change; search is debounced with{' '}
          <code>globalFilterDebounce</code>.
        </List.Item>
        <List.Item>
          <code>toServerQuery(query)</code> and <code>toSearchParams(query)</code> turn the query into{' '}
          <code>page/pageSize/offset/limit/sort/filter/search</code>.
        </List.Item>
        <List.Item>
          Request cancellation is up to your app. The demo uses an <code>AbortController</code> so only the latest response is applied.
        </List.Item>
        <List.Item>
          Show <code>loading</code> and <code>error</code> (with <code>onRetry</code>) while requests run.
        </List.Item>
      </List>
      <Section title="NestJS-style service (used by the demo)">
        <CodeBlock code={serviceCode} />
      </Section>
      <Section title="NestJS controller">
        <CodeBlock code={controllerCode} />
      </Section>
      <Section title="GraphQL">
        <CodeBlock
          code={`onQueryChange={(q) => {
  const { page, pageSize, sort, filter, search } = toServerQuery(q);
  client.query({ query: EMPLOYEES, variables: { page, pageSize, sort, filter, search } });
}}`}
        />
      </Section>
    </Page>
  );
}

export function ThemingPage() {
  return (
    <Page
      title="Dynamic Mantine themes"
      intro="The grid uses only Mantine CSS variables, so color scheme, primary color, fonts, radius and spacing come from your theme and update live."
    >
      <Demo component={ThemeDemo} code={themeCode} />
      <Section title="Customisation layers">
        <List size="sm">
          <List.Item>
            <b>Theme:</b> wrap your app in <code>MantineProvider</code>. Light and dark modes, primary color, radius, font family and
            spacing all apply automatically.
          </List.Item>
          <List.Item>
            <b>Theme defaults:</b> <code>theme.components.DataGrid = &#123; defaultProps, classNames, styles &#125;</code>.
          </List.Item>
          <List.Item>
            <b>Styles API:</b> the <code>classNames</code> and <code>styles</code> props target{' '}
            <code>
              root, toolbar, scrollArea, table, header, headerRow, headerCell, body, row, cell, groupRow, footer, footerCell, pagination,
              emptyState, errorState
            </code>
            . Static classes such as <code>mantine-DataGrid-cell</code> are added too.
          </List.Item>
          <List.Item>
            <b>Density:</b> <code>density="compact" | "standard" | "comfortable"</code> (users can switch it from the toolbar).
          </List.Item>
          <List.Item>
            <b>CSS variables:</b> override any of the variables below on <code>.mdg-root</code> or through <code>styles.root</code>.
          </List.Item>
        </List>
        <CodeBlock
          language="css"
          code={`.my-grid {
  --dg-header-bg: var(--mantine-color-indigo-light);
  --dg-border-color: var(--mantine-color-gray-3);
  --dg-hover-bg: var(--mantine-color-yellow-light);
  --dg-selected-bg: var(--mantine-color-teal-light);
  --dg-striped-bg: rgba(0, 0, 0, 0.03);
  --dg-focus-ring: var(--mantine-color-orange-filled);
  --dg-editing-ring: var(--mantine-color-violet-filled);
  --dg-dirty-color: var(--mantine-color-yellow-filled);
  --dg-error-color: var(--mantine-color-red-filled);
  --dg-radius: var(--mantine-radius-lg);
  --dg-font-size: var(--mantine-font-size-sm);
  --dg-cell-px: var(--mantine-spacing-md);
}`}
        />
      </Section>
    </Page>
  );
}

export function PersistencePage() {
  return (
    <Page title="State persistence" intro="Save and restore grid state in localStorage, sessionStorage or your own storage.">
      <Demo component={PersistenceDemo} code={persistenceCode} />
      <CodeBlock
        code={`persistState={{
  key: 'orders-grid',                 // unique per grid
  storage: 'local',                   // 'session' | { getItem, setItem, removeItem }
  include: ['sorting', 'columnVisibility', 'columnOrder', 'columnSizing', 'columnPinning', 'density', 'filterPresets'],
  version: 2,                         // bump to discard incompatible saved state
}}`}
      />
      <Text size="sm">
        Persisted values take precedence over <code>default*</code> props. Controlled props always win. Storage errors (quota exceeded,
        private mode) are ignored, because persistence is best-effort.
      </Text>
    </Page>
  );
}

export function AccessibilityPage() {
  return (
    <Page title="Accessibility" intro="The grid follows the WAI-ARIA grid and treegrid patterns.">
      <Section title="Keyboard">
        <Table withTableBorder fz="sm">
          <Table.Tbody>
            {[
              ['Tab', 'Moves focus into the grid (one tab stop, roving tabindex)'],
              ['← → ↑ ↓', 'Move between cells, including the header row'],
              ['Home / End', 'First / last cell in the row'],
              ['Ctrl+Home / Ctrl+End', 'First / last cell in the grid'],
              ['Page Up / Page Down', 'Move by one viewport of rows'],
              ['Enter / Space on header', 'Sort (Shift adds to a multi-sort)'],
              ['Alt+↓ on header', 'Open the column menu'],
              ['Alt+← / Alt+→ on header', 'Resize the column'],
              ['Enter / F2 / typing', 'Edit the cell'],
              ['Esc', 'Cancel editing'],
              ['Space', 'Toggle row selection; on group rows, expand/collapse'],
              ['Ctrl/⌘+A', 'Select all rows'],
              ['Space, arrows, Space on drag handle', 'Keyboard drag and drop'],
            ].map(([k, d]) => (
              <Table.Tr key={k}>
                <Table.Td>
                  <Kbd>{k}</Kbd>
                </Table.Td>
                <Table.Td>{d}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Section>
      <Section title="Semantics">
        <List size="sm">
          <List.Item>
            The grid uses <code>role="grid"</code> (<code>treegrid</code> when grouped) with <code>aria-rowcount</code>,{' '}
            <code>aria-colcount</code>, <code>aria-rowindex</code> and <code>aria-colindex</code>. Indices stay correct under pagination and
            virtualization.
          </List.Item>
          <List.Item>
            Headers expose <code>aria-sort</code>, rows expose <code>aria-selected</code>, and group rows expose <code>aria-expanded</code>{' '}
            and <code>aria-level</code>. The grid sets <code>aria-busy</code> while loading.
          </List.Item>
          <List.Item>Sort changes and filtered row counts are announced in a polite live region.</List.Item>
          <List.Item>
            Every control (checkboxes, menus, filter chips, drag handles, resizers) has an accessible name. Focus indicators use{' '}
            <code>--dg-focus-ring</code>.
          </List.Item>
          <List.Item>
            Transitions are turned off under <code>prefers-reduced-motion</code>.
          </List.Item>
          <List.Item>
            Pass an <code>aria-label</code> or <code>aria-labelledby</code> to name each grid.
          </List.Item>
        </List>
        <Text size="sm">Automated axe-core checks run in unit tests (jsdom) and in Chromium end-to-end tests in light and dark mode.</Text>
      </Section>
    </Page>
  );
}

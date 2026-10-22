# @kvmb/react-data-grid

[![CI](https://github.com/KathiravanBCS/kvmb-data-table/actions/workflows/ci.yml/badge.svg)](https://github.com/KathiravanBCS/kvmb-data-table/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kvmb/react-data-grid.svg)](https://www.npmjs.com/package/@kvmb/react-data-grid)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/types-included-3178c6.svg)

An enterprise React data grid for **[Mantine](https://mantine.dev)**, built on **TanStack Table v8**, **TanStack Virtual** and **dnd-kit**.
It takes its look from your `MantineProvider` theme (light/dark mode, primary color, fonts, radius, spacing) and ships strict TypeScript types.

> **Package name:** `@kvmb/react-data-grid` is a working name. Change `name` in `package.json` before publishing if you want a different scope.

## Features

| Area               | What you get                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering          | Generic `TData`, custom cells/headers/footers, nested accessors, column groups, empty/loading/error/skeleton states, truncation or wrapping, conditional row/cell styling, sticky header, three densities |
| Sorting            | Multi-column, custom `sortingFn`, controlled/uncontrolled, server-side, screen-reader announcements                                                                                                    |
| Filtering          | Global search (debounced), per-column quick filters, a visual **AND/OR filter builder with nested groups**, filter chips, saved presets, custom operators, a serializable JSON model, server-side mode  |
| Pagination         | Client/server, page-size selector, totals, loading state                                                                                                                                               |
| Selection          | Single/multiple, per-row rules, select page / all filtered, bulk actions, stable ids                                                                                                                    |
| Columns            | Visibility, resizing (mouse + keyboard), reordering, left/right pinning, locking, width limits, saved layouts                                                                                          |
| Editing            | Cell or row mode, text/number/select/multi-select/checkbox/date/date-time editors, custom editors, sync + async validation, dirty tracking, optimistic updates with rollback                         |
| Grouping           | Multi-level groups, counts, aggregated cells, aggregate footer, custom group headers, server-provided trees                                                                                            |
| Drag & drop        | Row and column reordering with pointer and keyboard                                                                                                                                                     |
| Performance        | Row virtualization, memoized rows (only rows whose inputs changed re-render)                                                                                                                           |
| Export             | CSV in the core; `.xlsx` (ExcelJS, loaded on demand) from a separate entry point                                                                                                                       |
| Persistence        | Save and restore state in local/session/custom storage                                                                                                                                                 |
| Accessibility      | WAI-ARIA grid/treegrid, roving tabindex, full keyboard support, live announcements, axe-checked in light and dark mode                                                                                 |

## Installation

```bash
npm install @kvmb/react-data-grid @mantine/core @mantine/hooks @mantine/dates dayjs
# optional, only needed for Excel export
npm install exceljs
```

```ts
// once, e.g. in your app entry — Mantine's styles first
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@kvmb/react-data-grid/styles.css';
```

### Compatibility

| Peer dependency                                     | Supported range                       | Tested with           |
| --------------------------------------------------- | ------------------------------------- | --------------------- |
| `react`, `react-dom`                                | `^19.0.0`                             | 19.3.1                |
| `@mantine/core`, `@mantine/hooks`, `@mantine/dates` | `>=8.3.0 <10`                         | 8.3.18 and 9.7.3      |
| `dayjs`                                             | `>=1.11.0`                            | 1.11.23               |
| `exceljs` (optional)                                | `^4.4.0`                              | 4.4.0                 |
| TypeScript (consumers)                              | 5.0+ (`bundler` or `node16` resolution) | 6.0.3               |

`@tanstack/react-table` (8.21), `@tanstack/react-virtual`, `@dnd-kit/*`, `@tabler/icons-react` and `clsx` are regular dependencies, installed automatically.
The package ships ESM, CommonJS and type declarations for both, and its entry points carry `'use client'` for the Next.js App Router.

## Quick start

```tsx
import { MantineProvider } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';

type Employee = { id: string; name: string; department: string; salary: number };

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'department', header: 'Department', meta: { filterVariant: 'select' } },
  { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number' }, aggregationFn: 'sum' },
];

export function Employees({ employees }: { employees: Employee[] }) {
  return (
    <MantineProvider>
      <DataGrid<Employee>
        data={employees}
        columns={columns}
        getRowId={(row) => row.id}
        enableSorting
        enableFiltering
        enableGrouping
        enableEditing
        enableVirtualization
        enableRowSelection
        enableExport
        height={600}
        onRowUpdate={async (updated) => {
          await api.update(updated); // throw to roll back the optimistic edit
        }}
      />
    </MantineProvider>
  );
}
```

Columns are plain TanStack `ColumnDef`s. Grid options live in the typed `meta` object (`align`, `filterVariant`, `editor`, `validate`, `format`, `locked`, `footerAggregation`, `excelNumberFormat`, …).

### Server-side data

```tsx
<DataGrid
  data={page.rows}
  rowCount={page.total}
  columns={columns}
  manualPagination
  manualSorting
  manualFiltering
  enablePagination
  enableFiltering
  loading={loading}
  error={error}
  onQueryChange={(query) => fetch(`/api/employees?${toSearchParams(query)}`)}
/>
```

`onQueryChange` fires on mount and on every change to pagination, sorting, the filter model or the (debounced) search.
The filter model is plain JSON, and `applyFilterModel` also runs in Node.js. The docs include a full NestJS-style example.

### Excel export

```ts
import { exportToExcel } from '@kvmb/react-data-grid/export';
await exportToExcel(apiRef.current.table, { filename: 'report.xlsx', rows: 'filtered', headerStyle: { fillColor: '#228BE6' } });
```

ExcelJS is not part of the initial bundle. It is loaded with a dynamic `import()` the first time you export.
Exports only include rows loaded in the grid, so for full server-side exports use a server endpoint.

## Documentation

Run the documentation site locally (live demos plus the source code of each demo):

```bash
npm install
npm run docs:dev        # http://127.0.0.1:5173
```

Pages: getting started, column definitions, sorting, advanced filtering, pagination, inline editing, grouping & aggregation, virtualization, row selection, column management, drag & drop, CSV & Excel export, server-side data, Mantine themes, state persistence, accessibility, API reference, migration guides and troubleshooting.

## Performance

Measured, not estimated. Your numbers will depend on hardware, column count and cell renderers.

**Real browser.** Headless Chromium, production docs build, 4-core container, 9 columns including Mantine badges and checkboxes:

| Scenario                                                        | Result                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Switch the demo from 10,000 to 100,000 rows (generate + render) | 0.9–1.3 s                                                                     |
| Rows in the DOM with 100,000 data rows                          | 34                                                                            |
| JS heap with 100,000 rows loaded                                | ≈ 400 MB                                                                      |
| Scrolling 400 px per frame                                      | median frame 23 ms (idle baseline 16.7 ms); ≈ 25 ms main-thread work per step |

**jsdom (`npm run bench`).** Node 22, React development build. This measures JavaScript cost only:

| Scenario                                       | Median   | Notes                                                       |
| ---------------------------------------------- | -------- | ----------------------------------------------------------- |
| Mount virtualized grid, 10,000 rows            | 371 ms   |                                                             |
| Mount virtualized grid, 100,000 rows           | 1,885 ms | 23 rows in the DOM; ≈ 566 MB heap while mounted             |
| TanStack core + sorted row model, 100,000 rows | 1,818 ms | the table engine alone, for comparison                      |
| `applyFilterModel`, nested AND/OR, 100,000 rows | 120 ms  |                                                             |
| `exportToCsv`, 10,000 rows                     | 226 ms   |                                                             |
| Heap retained after 10 mount/unmount cycles    | 15 MB    | unmounted grids are garbage-collected                       |

What these numbers show:

- Scrolling only renders newly visible rows. A 420 px scroll renders exactly 10 rows × 6 columns of cells, and existing rows are memoized.
- Memory scales with row count. TanStack Table v8 creates a row object with its own methods for every data row (about 4–5.5 KB each), so 100,000 rows take a few hundred MB.
- For datasets well beyond 100k rows, use server-side mode.

Bundle sizes (minified, gzip):

| File | Size |
| --- | --- |
| `dist/index.js` (core) | 26.7 kB |
| `dist/styles.css` | 2.3 kB |
| `dist/export/index.js` + chunks (CSV + Excel exporter, not ExcelJS) | ≈ 3.5 kB |

## Development

```bash
npm install            # npm ≥ 11 recommended (npm 10.9 crashes on vitest's optional peers)
npm run typecheck      # tsc --noEmit (strict)
npm run lint           # ESLint (typescript-eslint, react-hooks)
npm run format:check   # Prettier
npm run test           # unit + integration tests (Vitest + Testing Library + axe-core)
npm run test:types     # type-level tests
npm run test:e2e       # Playwright (Chromium, light + dark, axe WCAG A/AA)
npm run build          # Rollup → ESM, CJS, .d.ts/.d.cts, styles.css
npm run check:exports  # publint + are-the-types-wrong
npm run test:package   # install the packed tarball into a fresh React app and verify it
npm run bench          # performance measurements
```

`npm run test:e2e` builds the docs and serves them on port 4173. To use a pre-installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for design decisions.

## Publishing

Publishing is manual and needs explicit approval. Nothing publishes automatically.

```bash
npm run typecheck && npm run test && npm run build
npm run check:exports && npm run test:package
npm pack --dry-run                 # inspect the tarball contents
npm view @kvmb/react-data-grid      # confirm the name is available (404 = free)
npm publish --access public
```

The `Release` GitHub workflow runs the same checks and publishes only when started by hand, from a protected `npm-publish` environment.

## License

[MIT](./LICENSE)

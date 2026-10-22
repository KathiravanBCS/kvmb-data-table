# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-22

### Added

- `DataGrid` component (generic over the row type) built on TanStack Table v8, TanStack Virtual and dnd-kit, styled entirely with Mantine CSS variables.
- Sorting: multi-column, custom sorting functions, controlled/uncontrolled, server-side.
- Filtering: debounced global search, per-column quick filters, visual AND/OR filter builder with nested groups, filter chips, saved presets, custom operators, a serializable `FilterGroup` model, `applyFilterModel` for Node.js.
- Pagination: client/server, page-size selector, row totals.
- Row selection: single/multiple, per-row rules, select page / all filtered, bulk actions.
- Column management: visibility, resizing (mouse and keyboard), reordering, pinning, locking, saved layouts.
- Inline editing: cell and row modes, seven built-in editors, custom editors, sync/async validation, optimistic updates with rollback.
- Grouping and aggregation with aggregate footers and custom group headers.
- Row and column drag and drop (pointer and keyboard).
- Row virtualization with memoized rows.
- CSV export in the core; Excel export (`@kvmb/react-data-grid/export`) loading ExcelJS on demand.
- State persistence, imperative `DataGridApi`, Mantine Styles API support, three densities.
- WAI-ARIA grid/treegrid semantics, keyboard navigation and live announcements.
- Documentation site with live examples, unit/integration/type/e2e/accessibility tests, package verification and benchmarks.

# Architecture notes

## Layers

```
src/core        DataGrid component, useDataGrid (state + TanStack table), context, types, defaults
src/features    framework-agnostic or headless logic: filtering engine, editing state machine,
                persistence, pinning layout, keyboard navigation, drag & drop, selection column …
src/components  Mantine rendering: header, body/rows/cells, toolbar, filters, editors, pagination, overlays
src/export      CSV (core) and Excel (separate entry, lazy ExcelJS)
src/adapters    server query helpers
src/styles      one stylesheet built only from Mantine CSS variables
```

The data engine (`features/filtering/*`, `export/*`, `adapters/*`, `features/persistence`) has no React or Mantine dependency and is unit-tested on its own.

## Decisions

- **TanStack types are the public column API.** Consumers write ordinary `ColumnDef<TData>`. Grid options are added to `ColumnMeta` through module augmentation (`src/core/column-meta.ts`), so `meta` is fully typed without wrapper types.
- **One filter model.** Column quick filters, the builder and chips all edit a single serializable `FilterGroup`. It plugs into TanStack's pipeline as a wrapped `getFilteredRowModel`, so grouping, sorting, "select all filtered" and pagination all see the same result. TanStack `columnFilters` are not used. Predicates are plain functions in a registry, with no `eval`.
- **Controlled or uncontrolled for every state slice** via `useControllableState`, which accepts TanStack updaters.
- **Stable context + memoized rows.** The context object is stable and refreshed each render. Rows receive everything that affects them as props (`row`, selection, focus, edit state, a layout key), and a custom comparator re-renders only rows whose inputs changed. Editing is passed through a Proxy so rows always read the latest editing state without re-rendering on unrelated edits.
- **Div-based grid with flex rows** (not `<table>`). Virtualization (spacer rows), sticky pinned columns and resizing then need no table-layout workarounds. Pinned offsets are computed in `features/pinning`.
- **Grouped headers use CSS grid.** A single header row stays a flex row like the body. With column groups the header becomes a CSS grid whose tracks mirror the body columns (`minmax(size px, size fr)` grows them in proportion, matching the body's flex growth), so a group spans its children and an ungrouped column spans every header row instead of leaving empty placeholder cells. Header rows use `display: contents` and keep their `row` role.
- **Detail panels** are a second `row` rendered after the master row inside a `role="presentation"` wrapper, which is what the virtualizer measures. Keyboard navigation only handles cells whose closest grid is its own, so grids nested in panels keep separate focus.
- **Internal columns** (drag handle, selection, detail expander, row actions) are TanStack columns with reserved `__dg_` ids. They are always pinned and are filtered out of the user-facing pinning state, exports and column manager.
- **Optimistic editing overlays.** Saved rows are kept in an override map and merged over `data` until new data arrives. `data` stays the source of truth.
- **Heavy features stay out of the core bundle.** ExcelJS is an optional peer dependency loaded with `import()`. The grid's own "Export" menu reaches the Excel exporter through a dynamic import too.
- **Styling** uses Mantine's `useStyles`/`useProps`, so `classNames`, `styles` and `theme.components.DataGrid` work as in any Mantine component. Colors come only from Mantine variables, so theme and color-scheme changes apply without re-rendering.

## Known limitations

- Optimistic overrides apply to top-level rows. For tree data, update `data` in `onRowUpdate`.
- With virtualization, rows can only be dropped onto currently rendered rows.
- Detail-panel rows have no `aria-rowindex` and are not counted in `aria-rowcount`.
- A row with sub rows expands to its children, not to a detail panel.
- Row drag and drop is turned off while sorted or grouped, because the visual order differs from the data order.
- Column drag and drop is turned off for multi-level (grouped) headers.
- Memory: TanStack Table v8 allocates one row object with its own methods per data row (about 4–5.5 KB). Use server-side mode for very large datasets.
- Sticky headers need the grid to have its own scroll area (`height`/`maxHeight`).

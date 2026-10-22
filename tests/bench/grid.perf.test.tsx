/**
 * Performance measurements (run with `npm run bench`).
 *
 * jsdom has no layout or paint, so these numbers are the JavaScript cost of the
 * grid (row models, React render, virtualization) on the current machine.
 * Real-browser timings come from the Playwright suite (tests/e2e/grid.spec.ts).
 *
 * Each iteration yields to the event loop so TanStack's queued microtasks run
 * and unmounted tables can be garbage-collected.
 */
import { expect, it } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid, applyFilterModel, createFilterCondition, createFilterGroup, createOperatorRegistry, exportToCsv } from '../../src';
import { employeeColumns } from '../../examples/columns';
import { generateEmployees, type Employee } from '../../examples/data';

// jsdom has no layout: give the grid's scroll container a 600×1200 viewport.
for (const [prop, size] of [
  ['clientHeight', 600],
  ['clientWidth', 1200],
] as const) {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList?.contains('mdg-scroll') ? size : 0;
    },
  });
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const gc = () => (globalThis as { gc?: () => void }).gc?.();
const heapMb = () => Math.round(process.memoryUsage().heapUsed / 1e6);
const results: { name: string; median: number; min: number; runs: number; note?: string }[] = [];

async function measure(name: string, runs: number, fn: () => void | Promise<void>, note?: string) {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
    await settle();
  }
  times.sort((a, b) => a - b);
  results.push({ name, median: times[Math.floor(times.length / 2)], min: times[0], runs, note });
}

const rows100k = generateEmployees(100_000);
const rows10k = rows100k.slice(0, 10_000);

it('benchmarks', async () => {
  if (typeof (globalThis as { gc?: unknown }).gc !== 'function') throw new Error('Run with --expose-gc (npm run bench)');

  const grid = (data: Employee[]) => (
    <MantineProvider env="test">
      <DataGrid
        data={data}
        columns={employeeColumns}
        getRowId={(r) => r.id}
        enableVirtualization
        height={600}
        enableRowSelection
        enableFiltering
      />
    </MantineProvider>
  );

  await settle();
  gc();
  const beforeGrid = heapMb();
  let domRows = 0;
  let mountedHeap = 0;
  await measure('mount virtualized DataGrid, 10,000 rows', 5, () => {
    render(grid(rows10k));
    cleanup();
  });
  await measure('mount virtualized DataGrid, 100,000 rows', 5, async () => {
    const { container } = render(grid(rows100k));
    domRows = container.querySelectorAll('.mdg-tbody [role="row"]').length;
    await settle();
    gc();
    mountedHeap = heapMb();
    cleanup();
  });
  await settle();
  gc();
  const afterGrid = heapMb();
  results.at(-1)!.note = `${domRows} rows in the DOM; heap while mounted ≈ ${mountedHeap - beforeGrid} MB`;

  const registry = createOperatorRegistry();
  const field = (r: Employee, f: string) => (r as unknown as Record<string, unknown>)[f];
  const model = {
    ...createFilterGroup('and'),
    children: [
      createFilterCondition('department', 'in', ['Engineering', 'Sales']),
      {
        ...createFilterGroup('or'),
        children: [createFilterCondition('salary', 'gte', 150000), createFilterCondition('startDate', 'after', '2023-01-01')],
      },
    ],
  };
  await measure('applyFilterModel: nested AND/OR, 100,000 rows', 10, () => {
    applyFilterModel(rows100k, model, registry, field);
  });

  await measure('TanStack core + sorted row model, 100,000 rows', 5, () => {
    const { result, unmount } = renderHook(() =>
      useReactTable({
        data: rows100k,
        columns: employeeColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: { sorting: [{ id: 'salary', desc: true }] },
        onStateChange: () => {},
      }),
    );
    result.current.getRowModel();
    unmount();
    cleanup();
  });

  await measure('exportToCsv: 10,000 rows × visible columns', 5, () => {
    const { result, unmount } = renderHook(() =>
      useReactTable({
        data: rows10k,
        columns: employeeColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {},
        onStateChange: () => {},
      }),
    );
    exportToCsv(result.current, { download: false, rows: 'all' });
    unmount();
    cleanup();
  });

  console.log(`\nNode ${process.version}, ${process.arch}. Times in ms (median / min).\n`);
  console.log('| Scenario | Median | Min | Runs | Notes |\n|---|---:|---:|---:|---|');
  for (const r of results) console.log(`| ${r.name} | ${r.median.toFixed(1)} | ${r.min.toFixed(1)} | ${r.runs} | ${r.note ?? ''} |`);
  console.log(`\nHeap retained after 10 grid mount/unmount cycles: ${afterGrid - beforeGrid} MB.`);

  expect(domRows).toBeLessThan(80);
  // Unmounted grids must be collectable (allow some noise from jsdom / React internals).
  expect(afterGrid - beforeGrid).toBeLessThan(50);
});

#!/usr/bin/env node
/**
 * Installs the packed tarball into a brand-new React + Vite + TypeScript app
 * (outside this repository, so nothing resolves from our node_modules) and verifies:
 *
 *  1. TypeScript declarations (bundler and node16 resolution, ESM and CJS)
 *  2. ESM build with Vite, including the CSS import, and that ExcelJS is not
 *     part of the initial bundle
 *  3. CommonJS `require()` of both entry points
 *  4. Server-side rendering through ESM and CJS
 *  5. Subpath exports (`/export`, `/styles.css`, `/package.json`)
 *
 * Usage: npm run build && npm run test:package
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const keep = process.argv.includes('--keep');
const npm = process.env.NPM_BIN ?? 'npm';

const run = (cmd, cwd) => {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
};
const step = (name) => console.log(`\n=== ${name} ===`);

const work = mkdtempSync(join(tmpdir(), 'mdg-consumer-'));
const app = join(work, 'app');
mkdirSync(join(app, 'src'), { recursive: true });

try {
  step('pack');
  const packOut = execSync(`${npm} pack --pack-destination ${work} --json`, { cwd: root, encoding: 'utf8' });
  const [{ filename, size, unpackedSize, files }] = JSON.parse(packOut);
  const tarball = join(work, filename);
  console.log(`${filename}: ${(size / 1024).toFixed(1)} kB packed, ${(unpackedSize / 1024).toFixed(1)} kB unpacked, ${files.length} files`);
  const leaked = files.map((f) => f.path).filter((p) => !/^(dist\/|README\.md$|LICENSE$|CHANGELOG\.md$|package\.json$)/.test(p));
  if (leaked.length) throw new Error(`Unexpected files in tarball: ${leaked.join(', ')}`);

  step('create a fresh consumer app');
  const peer = pkg.peerDependencies;
  const mantine = pkg.devDependencies['@mantine/core'];
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: 'mdg-consumer',
        private: true,
        type: 'module',
        dependencies: {
          [pkg.name]: `file:${tarball}`,
          react: pkg.devDependencies.react,
          'react-dom': pkg.devDependencies['react-dom'],
          '@mantine/core': mantine,
          '@mantine/hooks': mantine,
          '@mantine/dates': mantine,
          dayjs: pkg.devDependencies.dayjs,
          exceljs: peer.exceljs,
        },
        devDependencies: {
          typescript: pkg.devDependencies.typescript,
          vite: pkg.devDependencies.vite,
          '@vitejs/plugin-react': pkg.devDependencies['@vitejs/plugin-react'],
          '@types/react': pkg.devDependencies['@types/react'],
          '@types/react-dom': pkg.devDependencies['@types/react-dom'],
          '@types/node': pkg.devDependencies['@types/node'],
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(app, 'src/App.tsx'),
    `import { useRef } from 'react';
import { MantineProvider } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid, createFilterCondition, createFilterGroup, type DataGridApi } from '${pkg.name}';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '${pkg.name}/styles.css';

type Employee = { id: string; name: string; department: string; salary: number };

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name', meta: { validate: (v) => (v ? null : 'required') } },
  { accessorKey: 'department', header: 'Department', meta: { filterVariant: 'select' } },
  { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number', align: 'right' } },
];

const rows: Employee[] = [{ id: '1', name: 'Ada', department: 'R&D', salary: 1 }];

export function App() {
  const api = useRef<DataGridApi<Employee>>(null);
  return (
    <MantineProvider>
      <button
        onClick={async () => {
          // The Excel exporter (and ExcelJS) must only load on demand.
          const { exportToExcel } = await import('${pkg.name}/export');
          await exportToExcel(api.current!.table);
        }}
      >
        export
      </button>
      <DataGrid<Employee>
        apiRef={api}
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        enableSorting
        enableFiltering
        enableGrouping
        enableEditing
        enableVirtualization
        enableRowSelection
        enableExport
        height={600}
        defaultFilterModel={{ ...createFilterGroup('and'), children: [createFilterCondition('salary', 'gt', 0)] }}
        onRowUpdate={async (row) => {
          void row.salary;
        }}
      />
    </MantineProvider>
  );
}
`,
  );
  writeFileSync(
    join(app, 'src/main.tsx'),
    `import { createRoot } from 'react-dom/client';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<App />);
`,
  );
  writeFileSync(
    join(app, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
  );
  writeFileSync(
    join(app, 'vite.config.ts'),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`,
  );
  // vite/client declares `*.css` side-effect imports (checked by TypeScript 6 by default).
  const tsBase = {
    target: 'ES2022',
    lib: ['ESNext', 'DOM'],
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    types: ['node', 'vite/client'],
  };
  writeFileSync(
    join(app, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { ...tsBase, module: 'ESNext', moduleResolution: 'Bundler' }, include: ['src'] }, null, 2),
  );
  // node16 resolution exercises the `exports` map conditions; skipLibCheck stays off for our .d.ts but
  // third-party declarations are not ours to vouch for, so they are checked only in the bundler config.
  writeFileSync(
    join(app, 'tsconfig.node16.json'),
    JSON.stringify(
      {
        compilerOptions: { ...tsBase, module: 'Node16', moduleResolution: 'Node16', skipLibCheck: true },
        files: ['types-esm.mts', 'types-cjs.cts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(app, 'types-esm.mts'),
    `import { DataGrid, type DataGridProps } from '${pkg.name}';
import { exportToExcel, type ExcelExportOptions } from '${pkg.name}/export';
export const checks: [typeof DataGrid, DataGridProps<{ id: string }>['data'], typeof exportToExcel, ExcelExportOptions<{ id: string }>['sheetName']] = [DataGrid, [], exportToExcel, 'x'];
`,
  );
  writeFileSync(
    join(app, 'types-cjs.cts'),
    `import grid = require('${pkg.name}');
import exporter = require('${pkg.name}/export');
export const checks = [grid.DataGrid, grid.applyFilterModel, exporter.exportToCsv] as const;
`,
  );

  const ssr = (format) => `${
    format === 'esm'
      ? `import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { MantineProvider } from '@mantine/core';
import * as grid from '${pkg.name}';
import * as exporter from '${pkg.name}/export';`
      : `const { createElement: h } = require('react');
const { renderToString } = require('react-dom/server');
const { MantineProvider } = require('@mantine/core');
const grid = require('${pkg.name}');
const exporter = require('${pkg.name}/export');`
  }
const data = [{ id: '1', name: 'Ada', salary: 10 }, { id: '2', name: 'Grace', salary: 20 }];
const columns = [{ accessorKey: 'name', header: 'Name' }, { accessorKey: 'salary', header: 'Salary' }];
const html = renderToString(h(MantineProvider, null, h(grid.DataGrid, { data, columns, enableFiltering: true, enableRowSelection: true, enablePagination: true, 'aria-label': 'People' })));
if (!html.includes('role="grid"') || !html.includes('Grace') || !html.includes('aria-label="People"')) throw new Error('SSR output is missing grid content');
if (typeof exporter.exportToExcel !== 'function' || typeof exporter.exportToCsv !== 'function') throw new Error('export entry is incomplete');
const filtered = grid.applyFilterModel(data, { type: 'group', id: 'r', logic: 'and', children: [grid.createFilterCondition('salary', 'gt', 15)] }, grid.createOperatorRegistry(), (r, f) => r[f]);
if (filtered.length !== 1) throw new Error('applyFilterModel failed');
console.log('${format.toUpperCase()} SSR ok (' + html.length + ' chars)');
`;
  writeFileSync(join(app, 'ssr-esm.mjs'), ssr('esm'));
  writeFileSync(join(app, 'ssr-cjs.cjs'), ssr('cjs'));
  writeFileSync(
    join(app, 'resolve.cjs'),
    `for (const id of ['${pkg.name}', '${pkg.name}/export', '${pkg.name}/styles.css', '${pkg.name}/package.json']) console.log(id, '→', require.resolve(id).split('node_modules/')[1]);\n`,
  );

  step('install');
  run(`${npm} install --no-audit --no-fund`, app);

  step('type-check (bundler resolution, skipLibCheck: false)');
  run('npx tsc -p tsconfig.json', app);
  step('type-check (node16 resolution, ESM + CJS)');
  run('npx tsc -p tsconfig.node16.json', app);

  step('vite production build (ESM + CSS)');
  run('npx vite build --logLevel warn', app);
  const assets = readdirSync(join(app, 'dist/assets'));
  const css = assets
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(app, 'dist/assets', f), 'utf8'))
    .join('');
  if (!css.includes('.mdg-root')) throw new Error('Grid CSS was not bundled');
  const entry = readFileSync(join(app, 'dist/index.html'), 'utf8').match(/assets\/(index-[^"]+\.js)/)?.[1];
  const entryCode = readFileSync(join(app, 'dist/assets', entry), 'utf8');
  if (/JSZip|exceljs/i.test(entryCode) && !/import\(/.test(entryCode)) throw new Error('ExcelJS leaked into the entry chunk');
  const excelChunk = assets.find((f) => /exceljs/i.test(f) || /JSZip/.test(readFileSync(join(app, 'dist/assets', f), 'utf8')));
  if (!excelChunk || excelChunk === entry) throw new Error('ExcelJS should be emitted as a separate lazy chunk');
  for (const f of assets) console.log(`  ${f.padEnd(40)} ${(readFileSync(join(app, 'dist/assets', f)).length / 1024).toFixed(1)} kB`);

  step('resolve subpath exports');
  run('node resolve.cjs', app);
  step('SSR via ESM import');
  run('node ssr-esm.mjs', app);
  step('SSR via CommonJS require');
  run('node ssr-cjs.cjs', app);

  console.log('\n✅ package verification passed');
} catch (error) {
  console.error('\n❌ package verification failed:', error.message);
  process.exitCode = 1;
} finally {
  if (keep) console.log(`(kept ${work})`);
  else rmSync(work, { recursive: true, force: true });
}

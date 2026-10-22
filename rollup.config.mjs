// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import cssnano from 'cssnano';
import { dts } from 'rollup-plugin-dts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Every dependency / peer dependency (and their sub-paths) stays external, so
// consumers get a single copy of React, Mantine, TanStack, dnd-kit and ExcelJS.
const externalPackages = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {}), 'react/jsx-runtime'];
const external = (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`));

const input = {
  index: 'src/index.ts',
  'export/index': 'src/export/index.ts',
};

const jsPlugins = () => [
  nodeResolve({ extensions: ['.ts', '.tsx', '.js', '.mjs'] }),
  commonjs(),
  typescript({
    tsconfig: 'tsconfig.build.json',
    useTsconfigDeclarationDir: false,
    clean: true,
    tsconfigOverride: {
      compilerOptions: { declaration: false, emitDeclarationOnly: false, noEmit: false, sourceMap: true },
    },
  }),
  // The preamble marks modules as client components for React Server Components
  // frameworks (Next.js App Router); terser keeps source maps aligned.
  terser({ format: { comments: /^!|@license/, preamble: "'use client';" }, compress: { passes: 2 }, mangle: true }),
];

/** Drops the JS stub Rollup emits for the CSS-only build. */
const cssOnly = () => ({
  name: 'css-only',
  generateBundle(_options, bundle) {
    for (const file of Object.keys(bundle)) if (file.endsWith('.js')) delete bundle[file];
  },
});

export default defineConfig([
  {
    input,
    external,
    plugins: jsPlugins(),
    output: [
      {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        sourcemap: true,
      },
      {
        dir: 'dist',
        format: 'cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: 'chunks/[name]-[hash].cjs',
        sourcemap: true,
        exports: 'named',
        interop: 'auto',
      },
    ],
  },
  {
    input: { index: 'dist/types/index.d.ts', 'export/index': 'dist/types/export/index.d.ts' },
    external,
    plugins: [dts()],
    output: [
      { dir: 'dist', format: 'es', entryFileNames: '[name].d.ts', chunkFileNames: 'chunks/[name]-[hash].d.ts' },
      { dir: 'dist', format: 'es', entryFileNames: '[name].d.cts', chunkFileNames: 'chunks/[name]-[hash].d.cts' },
    ],
  },
  {
    input: 'src/styles/data-grid.css',
    plugins: [
      postcss({
        extract: 'styles.css',
        minimize: false,
        sourceMap: false,
        plugins: [postcssImport(), postcssPresetEnv({ stage: 2, features: { 'nesting-rules': true } }), cssnano({ preset: 'default' })],
      }),
      cssOnly(),
    ],
    output: { dir: 'dist', assetFileNames: '[name][extname]' },
  },
]);

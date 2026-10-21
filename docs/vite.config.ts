import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The docs consume the library source directly so examples always match the code.
export default defineConfig({
  root: src('.'),
  base: process.env.DOCS_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@kvmb\/react-data-grid\/export$/, replacement: src('../src/export/index.ts') },
      { find: /^@kvmb\/react-data-grid\/styles\.css$/, replacement: src('../src/styles/data-grid.css') },
      { find: /^@kvmb\/react-data-grid$/, replacement: src('../src/index.ts') },
    ],
  },
  server: { port: 5173, host: '127.0.0.1' },
  preview: { port: 4173, host: '127.0.0.1' },
  build: { outDir: src('./dist'), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});

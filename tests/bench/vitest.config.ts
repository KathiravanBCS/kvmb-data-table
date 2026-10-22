import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/bench/**/*.perf.test.tsx'],
    testTimeout: 600_000,
    // Exposes gc() so heap measurements are taken after a full collection.
    execArgv: ['--expose-gc', '--max-old-space-size=4096'],
  },
});

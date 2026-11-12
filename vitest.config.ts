import { defineConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

// Same zone on every machine and in CI, like Playwright. Tests that must prove browser-zone independence switch it.
process.env.TZ = 'Europe/Oslo';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
  plugins: [tsconfigPaths()],
  test: {
    watch: false,
    globals: false,
    environment: 'node',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
  },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@liteforge/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@liteforge/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
      '@liteforge/store': path.resolve(__dirname, 'packages/store/src/index.ts'),
      '@liteforge/router': path.resolve(__dirname, 'packages/router/src/index.ts'),
      '@liteforge/vite-plugin': path.resolve(__dirname, 'packages/vite-plugin/src/index.ts'),
      '@liteforge/table': path.resolve(__dirname, 'packages/table/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.test.ts'],
    // Use happy-dom for runtime tests (has synchronous MutationObserver)
    environmentMatchGlobs: [
      ['packages/core/**', 'node'],
      ['packages/runtime/**', 'happy-dom'],
      ['packages/router/**', 'happy-dom'],
      ['packages/store/**', 'node'],
      ['packages/vite-plugin/**', 'node'],
      ['packages/devtools/**', 'happy-dom'],
      ['packages/table/**', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Only measure coverage for files actually imported by tests
      all: false,
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/index.ts',
        '**/*.test.ts',
        '**/types.ts',
      ],
      thresholds: {
        // Global thresholds - relaxed to account for browser-only code
        // Core logic (signals, route-matcher, main router) should exceed these
        // Browser-specific code (BrowserHistory, HashHistory, DOM middlewares)
        // will be tested with Playwright in a later phase
        lines: 80,
        branches: 80,
        functions: 75,
        statements: 80,
      },
    },
  },
});

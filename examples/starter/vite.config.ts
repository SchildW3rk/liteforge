import { defineConfig } from 'vite';
import liteforge from 'liteforge/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [liteforge()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // ES2022 supports top-level await
    target: 'es2022',
  },
  resolve: {
    alias: {
      // Resolve to source files during development - no stale dist/ types
      'liteforge/vite-plugin': path.resolve(__dirname, '../../packages/liteforge/src/vite-plugin.ts'),
      'liteforge/router': path.resolve(__dirname, '../../packages/liteforge/src/router.ts'),
      'liteforge/store': path.resolve(__dirname, '../../packages/liteforge/src/store.ts'),
      'liteforge/query': path.resolve(__dirname, '../../packages/liteforge/src/query.ts'),
      'liteforge/client': path.resolve(__dirname, '../../packages/liteforge/src/client.ts'),
      'liteforge/form': path.resolve(__dirname, '../../packages/liteforge/src/form.ts'),
      'liteforge/table': path.resolve(__dirname, '../../packages/liteforge/src/table.ts'),
      'liteforge/modal': path.resolve(__dirname, '../../packages/liteforge/src/modal.ts'),
      'liteforge/calendar': path.resolve(__dirname, '../../packages/liteforge/src/calendar.ts'),
      'liteforge/devtools': path.resolve(__dirname, '../../packages/liteforge/src/devtools.ts'),
      'liteforge': path.resolve(__dirname, '../../packages/liteforge/src/index.ts'),
    },
  },
});

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
      'liteforge/i18n': path.resolve(__dirname, '../../packages/liteforge/src/i18n.ts'),
      'liteforge': path.resolve(__dirname, '../../packages/liteforge/src/index.ts'),
      // Direct @liteforge/* aliases — injected by the Vite plugin (JSX transform)
      '@liteforge/runtime': path.resolve(__dirname, '../../packages/runtime/src/index.ts'),
      '@liteforge/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@liteforge/router': path.resolve(__dirname, '../../packages/router/src/index.ts'),
      '@liteforge/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@liteforge/query': path.resolve(__dirname, '../../packages/query/src/index.ts'),
      '@liteforge/client': path.resolve(__dirname, '../../packages/client/src/index.ts'),
      '@liteforge/form': path.resolve(__dirname, '../../packages/form/src/index.ts'),
      '@liteforge/table': path.resolve(__dirname, '../../packages/table/src/index.ts'),
      '@liteforge/modal': path.resolve(__dirname, '../../packages/modal/src/index.ts'),
      '@liteforge/calendar': path.resolve(__dirname, '../../packages/calendar/src/index.ts'),
      '@liteforge/devtools': path.resolve(__dirname, '../../packages/devtools/src/index.ts'),
      '@liteforge/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@liteforge/vite-plugin': path.resolve(__dirname, '../../packages/vite-plugin/src/index.ts'),
    },
  },
});

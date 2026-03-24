import { defineConfig } from 'vite';
import liteforge from '@liteforge/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    liteforge(),
  ],
  server: {
    port: 3002,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Reactive foundation — loaded on every page, tiny and stable
          'lf-core':     ['@liteforge/core'],
          // Component runtime + JSX helpers — shared by all pages
          'lf-runtime':  ['@liteforge/runtime'],
          // Router — needed on every page (Layout uses RouterOutlet)
          'lf-router':   ['@liteforge/router'],
          // Store — used by Layout (themeStore) and a few pages
          'lf-store':    ['@liteforge/store'],
          // UI plugins that are globally registered in main.tsx
          'lf-ui-core':  ['@liteforge/modal', '@liteforge/toast', '@liteforge/tooltip'],
          // i18n — globally registered, but translations are already split
          'lf-i18n':     ['@liteforge/i18n'],
          // Heavy packages that belong to a single lazy page
          'lf-calendar': ['@liteforge/calendar'],
          'lf-form':     ['@liteforge/form'],
          'lf-table':    ['@liteforge/table'],
          'lf-client':   ['@liteforge/client'],
          'lf-query':    ['@liteforge/query'],
        },
      },
    },
  },
  resolve: {
    alias: {
      // Umbrella package (core + runtime convenience re-export)
      'liteforge':              path.resolve(__dirname, '../packages/liteforge/src/index.ts'),
      // @liteforge/* — point directly to package src for local dev
      '@liteforge/core':        path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@liteforge/runtime':     path.resolve(__dirname, '../packages/runtime/src/index.ts'),
      '@liteforge/router':      path.resolve(__dirname, '../packages/router/src/index.ts'),
      '@liteforge/store':       path.resolve(__dirname, '../packages/store/src/index.ts'),
      '@liteforge/query':       path.resolve(__dirname, '../packages/query/src/index.ts'),
      '@liteforge/client':      path.resolve(__dirname, '../packages/client/src/index.ts'),
      '@liteforge/form':        path.resolve(__dirname, '../packages/form/src/index.ts'),
      '@liteforge/table':       path.resolve(__dirname, '../packages/table/src/index.ts'),
      '@liteforge/modal':       path.resolve(__dirname, '../packages/modal/src/index.ts'),
      '@liteforge/calendar':    path.resolve(__dirname, '../packages/calendar/src/index.ts'),
      '@liteforge/devtools':    path.resolve(__dirname, '../packages/devtools/src/index.ts'),
      '@liteforge/i18n':        path.resolve(__dirname, '../packages/i18n/src/index.ts'),
      '@liteforge/vite-plugin': path.resolve(__dirname, '../packages/vite-plugin/src/index.ts'),
      '@liteforge/admin':       path.resolve(__dirname, '../packages/admin/src/index.ts'),
      '@liteforge/toast':       path.resolve(__dirname, '../packages/toast/src/index.ts'),
      '@liteforge/tooltip':     path.resolve(__dirname, '../packages/tooltip/src/index.ts'),
    },
  },
});

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
    // Allow .js imports in TypeScript source files to resolve to .ts
    // This is needed for packages served from src/ via alias (internal imports use .js extensions per ESM convention)
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    alias: {
      // liteforge/* and @liteforge/* must resolve to the EXACT same physical file.
      // If liteforge/query → packages/liteforge/src/query.ts (which re-exports @liteforge/query)
      // Vite creates two module instances → two reactivity graphs → signals don't track effects.
      // Fix: point every liteforge/* directly to the package source, same as @liteforge/*.
      'liteforge/vite-plugin': path.resolve(__dirname, '../../packages/vite-plugin/src/index.ts'),
      'liteforge/router':      path.resolve(__dirname, '../../packages/router/src/index.ts'),
      'liteforge/store':       path.resolve(__dirname, '../../packages/store/src/index.ts'),
      'liteforge/query':       path.resolve(__dirname, '../../packages/query/src/index.ts'),
      'liteforge/client':      path.resolve(__dirname, '../../packages/client/src/index.ts'),
      'liteforge/form':        path.resolve(__dirname, '../../packages/form/src/index.ts'),
      'liteforge/table':       path.resolve(__dirname, '../../packages/table/src/index.ts'),
      'liteforge/modal':       path.resolve(__dirname, '../../packages/modal/src/index.ts'),
      'liteforge/calendar':    path.resolve(__dirname, '../../packages/calendar/src/index.ts'),
      'liteforge/devtools':    path.resolve(__dirname, '../../packages/devtools/src/index.ts'),
      'liteforge/i18n':        path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      'liteforge/admin':       path.resolve(__dirname, '../../packages/admin/src/index.ts'),
      'liteforge/toast':       path.resolve(__dirname, '../../packages/toast/src/index.ts'),
      'liteforge/tooltip':     path.resolve(__dirname, '../../packages/tooltip/src/index.ts'),
      // liteforge (bare) stays on the umbrella barrel (core + runtime re-exports only)
      'liteforge':             path.resolve(__dirname, '../../packages/liteforge/src/index.ts'),
      // @liteforge/* aliases — used by the Vite plugin JSX transform and package internals
      '@liteforge/runtime':    path.resolve(__dirname, '../../packages/runtime/src/index.ts'),
      '@liteforge/core':       path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@liteforge/router':     path.resolve(__dirname, '../../packages/router/src/index.ts'),
      '@liteforge/store':      path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@liteforge/query':      path.resolve(__dirname, '../../packages/query/src/index.ts'),
      '@liteforge/client':     path.resolve(__dirname, '../../packages/client/src/index.ts'),
      '@liteforge/form':       path.resolve(__dirname, '../../packages/form/src/index.ts'),
      '@liteforge/table':      path.resolve(__dirname, '../../packages/table/src/index.ts'),
      '@liteforge/modal':      path.resolve(__dirname, '../../packages/modal/src/index.ts'),
      '@liteforge/calendar':   path.resolve(__dirname, '../../packages/calendar/src/index.ts'),
      '@liteforge/devtools':   path.resolve(__dirname, '../../packages/devtools/src/index.ts'),
      '@liteforge/i18n':       path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@liteforge/vite-plugin':path.resolve(__dirname, '../../packages/vite-plugin/src/index.ts'),
      '@liteforge/admin':      path.resolve(__dirname, '../../packages/admin/src/index.ts'),
      '@liteforge/theme/css':  path.resolve(__dirname, '../../packages/theme/css/index.css'),
      '@liteforge/theme':      path.resolve(__dirname, '../../packages/theme/src/index.ts'),
      '@liteforge/toast':      path.resolve(__dirname, '../../packages/toast/src/index.ts'),
      '@liteforge/tooltip':    path.resolve(__dirname, '../../packages/tooltip/src/index.ts'),
    },
  },
});

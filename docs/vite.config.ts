import { defineConfig } from 'vite';
import liteforge from 'liteforge/vite-plugin';
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
  },
  resolve: {
    alias: {
      'liteforge/vite-plugin': path.resolve(__dirname, '../packages/liteforge/src/vite-plugin.ts'),
      'liteforge/router': path.resolve(__dirname, '../packages/liteforge/src/router.ts'),
      'liteforge/query': path.resolve(__dirname, '../packages/liteforge/src/query.ts'),
      'liteforge/form': path.resolve(__dirname, '../packages/liteforge/src/form.ts'),
      'liteforge/table': path.resolve(__dirname, '../packages/liteforge/src/table.ts'),
      'liteforge/client': path.resolve(__dirname, '../packages/liteforge/src/client.ts'),
      'liteforge/calendar': path.resolve(__dirname, '../packages/liteforge/src/calendar.ts'),
      'liteforge/store': path.resolve(__dirname, '../packages/liteforge/src/store.ts'),
      'liteforge/modal': path.resolve(__dirname, '../packages/liteforge/src/modal.ts'),
      'liteforge/devtools': path.resolve(__dirname, '../packages/liteforge/src/devtools.ts'),
      'liteforge': path.resolve(__dirname, '../packages/liteforge/src/index.ts'),
    },
  },
});

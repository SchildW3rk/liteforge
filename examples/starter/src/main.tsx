/**
 * Application Entry Point
 *
 * Bootstraps the LiteForge application using the plugin system:
 * - .use(routerPlugin)   → router lifecycle managed by plugin
 * - .use(modalPlugin)    → modal container inserted next to #app
 * - .useDev(devtoolsPlugin) → DevTools only in dev, tree-shaken from prod
 */

import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import { clientPlugin, queryIntegration } from 'liteforge/client';
import { queryPlugin } from 'liteforge/query';
import { modalPlugin } from 'liteforge/modal';
import { i18nPlugin } from 'liteforge/i18n';
import type { TranslationTree } from 'liteforge/i18n';
import { adminPlugin } from 'liteforge/admin';
import { toastPlugin } from 'liteforge/toast';

// Import app components
import { App } from './App.js';
import { createAppRouter } from './router.js';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';

// Import styles
import './styles.css';

// =============================================================================
// i18n loader — lazy-loads locale files
// =============================================================================

async function loadLocale(locale: string): Promise<TranslationTree> {
  if (locale === 'de') {
    const mod = await import('./locales/de.js');
    return mod.default as TranslationTree;
  }
  const mod = await import('./locales/en.js');
  return mod.default as TranslationTree;
}


// =============================================================================
// Application Bootstrap
// =============================================================================

const app = await createApp({
  root: App,
  target: '#app',
  stores: [authStore, uiStore],
  debug: true,
})
  .use(routerPlugin(createAppRouter()))
  .use(queryPlugin())
  .use(clientPlugin({ baseUrl: '/api', query: queryIntegration() }))
  .use(modalPlugin())
  .use(i18nPlugin({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    load: loadLocale,
    persist: true,
    storageKey: 'lf-demo-locale',
  }))
  .use(toastPlugin({ position: 'bottom-right' }))
  .use(adminPlugin({ basePath: '/lf-admin' }))
  .useDev(() => import('liteforge/devtools').then(m => m.devtoolsPlugin({
    shortcut: 'ctrl+shift+d',
    position: 'right',
    defaultTab: 'signals',
    width: 400,
    maxEvents: 500,
  })))
  .mount();

export { app };

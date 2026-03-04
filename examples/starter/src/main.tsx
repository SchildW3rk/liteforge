/**
 * Application Entry Point
 *
 * Bootstraps the LiteForge application using the plugin system:
 * - .use(routerPlugin)   → router lifecycle managed by plugin
 * - .use(modalPlugin)    → modal container inserted next to #app
 * - .use(devtoolsPlugin) → DevTools panel inserted next to #app
 */

import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import { clientPlugin, queryIntegration } from 'liteforge/client';
import { queryPlugin } from 'liteforge/query';
import { modalPlugin } from 'liteforge/modal';
import { devtoolsPlugin } from 'liteforge/devtools';

// Import app components
import { App } from './App.js';
import { createAppRouter } from './router.js';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';

// Import styles
import './styles.css';


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
  .use(devtoolsPlugin({
    shortcut: 'ctrl+shift+d',
    position: 'right',
    defaultTab: 'signals',
    width: 400,
    maxEvents: 500,
  }))
  .mount();

console.log('[LiteForge] App mounted. Press Ctrl+Shift+D to open DevTools.');

export { app };

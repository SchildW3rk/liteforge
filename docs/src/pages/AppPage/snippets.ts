// No imports — pure string constants

export const MINIMAL_CODE = `import { createApp } from 'liteforge';
import { App } from './App.js';

// Minimal bootstrap — no plugins
await createApp({ root: App, target: '#app' });`;

export const FULL_CODE = `import { createApp } from 'liteforge';
import { routerPlugin } from '@liteforge/router';
import { queryPlugin } from '@liteforge/query';
import { clientPlugin, queryIntegration } from '@liteforge/client';
import { modalPlugin } from '@liteforge/modal';
import { toastPlugin } from '@liteforge/toast';
import { i18nPlugin } from '@liteforge/i18n';

import { App } from './App.js';
import { router } from './router.js';
import { authStore, uiStore } from './stores/index.js';

const app = await createApp({
  root: App,
  target: '#app',

  // Pre-register global stores — they are initialized before any component mounts
  stores: [authStore, uiStore],

  // Expose app context globally as window.$lf in dev
  debug: true,
})
  .use(routerPlugin(router))
  .use(queryPlugin())
  .use(clientPlugin({ baseUrl: '/api', query: queryIntegration() }))
  .use(modalPlugin())
  .use(toastPlugin({ position: 'bottom-right' }))
  .use(i18nPlugin({ defaultLocale: 'en', load: loadLocale }))
  // useDev() — plugin is loaded only in dev, tree-shaken from prod build
  .useDev(() => import('@liteforge/devtools').then(m => m.devtoolsPlugin()))
  .mount();

export { app };`;

export const PLUGIN_CODE = `import type { LiteForgePlugin } from 'liteforge';

// A plugin is a factory that returns a LiteForgePlugin object
export function myPlugin(options: MyPluginOptions): LiteForgePlugin {
  return {
    name: 'my-plugin',

    // install() runs before mount. Async install is supported — app waits.
    async install({ provide, resolve, target }) {
      // provide() — make a value available to components via use()
      const api = await createMyApi(options);
      provide('myApi', api);

      // resolve() — access another plugin's provided value
      const router = resolve('router');

      // Return a cleanup function (called on app destroy)
      return () => api.destroy();
    },
  };
}

// Declaration merging — type use('myApi') in components:
declare module 'liteforge' {
  interface PluginRegistry {
    myApi: MyApi;
  }
}`;

export const USE_CODE = `import { createComponent } from 'liteforge';

export const MyComponent = createComponent({
  name: 'MyComponent',
  setup({ use }) {
    // Access any registered plugin value by key
    const router = use('router');
    const modal  = use('modal');
    const client = use('client');
    return { router, modal, client };
  },
  component({ setup }) {
    const { router } = setup;
    return <button onclick={() => router.push('/home')}>Go home</button>;
  },
});`;

export const CONTEXT_CODE = `// Provide values at app level — available in all components
const app = await createApp({
  root: App,
  target: '#app',
  context: {
    apiBaseUrl: import.meta.env.VITE_API_URL,
    featureFlags: { darkMode: true, betaFeatures: false },
  },
});

// In any component:
setup({ use }) {
  const flags = use('featureFlags');
  return { flags };
}`;

export const STORES_CODE = `// Stores passed to createApp() are initialized before any component mounts.
// Components that call use() or defineStore() get the same singleton instance.

import { authStore } from './stores/auth.js';
import { uiStore }   from './stores/ui.js';

await createApp({
  root: App,
  target: '#app',
  stores: [authStore, uiStore],  // initialized in order
});

// In any component — same singleton, no import needed:
setup({ use }) {
  const auth = use('authStore');
  return { isLoggedIn: auth.getters.isLoggedIn };
}`;

export const DEBUG_CODE = `// debug: true → exposes window.$lf in the browser console
await createApp({ root: App, target: '#app', debug: true });

// In DevTools console:
$lf.stores        // all registered stores by name
$lf.router        // current router instance
$lf.context       // full app context (plugins + custom values)
$lf.snapshot()    // full state snapshot of all stores
$lf.unmount()     // unmount the app programmatically

// Also enables @liteforge/devtools to connect:
.useDev(() => import('@liteforge/devtools').then(m => m.devtoolsPlugin({
  shortcut: 'ctrl+shift+d',
  position: 'right',
  defaultTab: 'signals',
})))`;

export const THENABLE_CODE = `// AppBuilder is Thenable — top-level await works directly:
const app = await createApp({ root: App, target: '#app' }).use(routerPlugin(r)).mount();

// Or with .then() / .catch():
createApp({ root: App, target: '#app' })
  .use(routerPlugin(r))
  .mount()
  .then(app => console.log('mounted', app))
  .catch(err => console.error('boot failed', err));

// Chaining .use() after .mount() throws — all plugins must be registered first
const builder = createApp({ ... });
builder.mount();      // starts mount
builder.use(plugin);  // ← throws: cannot add plugin after mount()`;

export const DESTROY_CODE = `// app.unmount() unmounts the component tree and calls all plugin cleanups
const app = await createApp({ root: App, target: '#app' })
  .use(routerPlugin(r))
  .mount();

// Later:
app.unmount();   // router cleanup → modal cleanup → … (reverse order)`;

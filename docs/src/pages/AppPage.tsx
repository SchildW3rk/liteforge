import { createComponent } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Code strings ──────────────────────────────────────────────────────────────

const MINIMAL_CODE = `import { createApp } from 'liteforge';
import { App } from './App.js';

// Minimal bootstrap — no plugins
await createApp({ root: App, target: '#app' });`;

const FULL_CODE = `import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import { queryPlugin } from 'liteforge/query';
import { clientPlugin, queryIntegration } from 'liteforge/client';
import { modalPlugin } from 'liteforge/modal';
import { toastPlugin } from 'liteforge/toast';
import { i18nPlugin } from 'liteforge/i18n';

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
  .useDev(() => import('liteforge/devtools').then(m => m.devtoolsPlugin()))
  .mount();

export { app };`;

const PLUGIN_CODE = `import type { LiteForgePlugin } from 'liteforge';

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

const USE_CODE = `import { createComponent } from 'liteforge';

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

const CONTEXT_CODE = `// Provide values at app level — available in all components
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

const STORES_CODE = `// Stores passed to createApp() are initialized before any component mounts.
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

const DEBUG_CODE = `// debug: true → exposes window.$lf in the browser console
await createApp({ root: App, target: '#app', debug: true });

// In DevTools console:
$lf.stores          // all registered stores
$lf.router          // current router instance
$lf.plugins         // all installed plugins
$lf.signals         // registered signal graph (if @liteforge/devtools installed)

// Also enables @liteforge/devtools to connect:
.useDev(() => import('liteforge/devtools').then(m => m.devtoolsPlugin({
  shortcut: 'ctrl+shift+d',
  position: 'right',
  defaultTab: 'signals',
})))`;

const THENABLE_CODE = `// AppBuilder is Thenable — top-level await works directly:
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

const DESTROY_CODE = `// app.destroy() unmounts the component tree and calls all plugin cleanups
const app = await createApp({ root: App, target: '#app' })
  .use(routerPlugin(r))
  .mount();

// Later:
app.destroy();   // router cleanup → modal cleanup → … (reverse order)`;

// ─── API rows ──────────────────────────────────────────────────────────────────

const CREATE_APP_API: ApiRow[] = [
  { name: 'root', type: 'ComponentFactory', description: 'Root component of the application' },
  { name: 'target', type: 'string | HTMLElement', description: 'CSS selector or element to mount into' },
  { name: 'stores', type: 'StoreDefinition[]', default: '[]', description: 'Stores to initialize before mount — available via use() in all components' },
  { name: 'context', type: 'Record<string, unknown>', default: '{}', description: 'Arbitrary values provided to all components via use()' },
  { name: 'debug', type: 'boolean', default: 'false', description: 'Exposes window.$lf for console debugging. Required for @liteforge/devtools.' },
];

const BUILDER_API: ApiRow[] = [
  { name: '.use(plugin)', type: 'AppBuilder', description: 'Register a plugin. Returns the builder for chaining. Throws after .mount().' },
  { name: '.useDev(factory)', type: 'AppBuilder', description: 'Register a plugin only in development (import.meta.env.DEV). Factory is a function returning Promise<LiteForgePlugin>. Tree-shaken in prod.' },
  { name: '.mount()', type: 'Promise<App>', description: 'Install all plugins (in registration order, awaiting async installs) then mount the root component. Returns the App instance.' },
  { name: '.then(fn)', type: 'Promise<App>', description: 'Thenable — delegates to .mount().then(fn). Enables top-level await without explicit .mount() call.' },
  { name: '.catch(fn)', type: 'Promise<App>', description: 'Thenable — delegates to .mount().catch(fn).' },
];

const PLUGIN_API: ApiRow[] = [
  { name: 'name', type: 'string', description: 'Unique plugin identifier. Duplicate names throw before any install() runs.' },
  { name: 'install(ctx)', type: 'void | (() => void) | Promise<void | (() => void)>', description: 'Called once during mount. Async is supported — app waits for resolution. Return a cleanup function to run on app.destroy().' },
];

const PLUGIN_CTX_API: ApiRow[] = [
  { name: 'provide(key, value)', type: 'void', description: 'Register a value accessible via use(key) in all components.' },
  { name: 'resolve(key)', type: 'PluginRegistry[K]', description: 'Access a value provided by another plugin. Throws if the key is not yet registered.' },
  { name: 'target', type: 'HTMLElement', description: 'The resolved mount target element.' },
];

const APP_API: ApiRow[] = [
  { name: 'destroy()', type: 'void', description: 'Unmount the root component and run all plugin cleanup functions in reverse registration order.' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const AppPage = createComponent({
  name: 'AppPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">App Bootstrap</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            <code class="text-indigo-400 text-sm">createApp()</code> bootstraps a LiteForge application.
            It initializes stores, installs plugins in order (awaiting async installs), then mounts the root
            component. The builder is{' '}
            <code class="text-indigo-400 text-sm">Thenable</code> — top-level{' '}
            <code class="text-indigo-400 text-sm">await</code> works without an explicit{' '}
            <code class="text-indigo-400 text-sm">.mount()</code> call.
          </p>
        </div>

        <DocSection title="Minimal bootstrap" id="minimal">
          <CodeBlock code={MINIMAL_CODE} language="typescript" />
        </DocSection>

        <DocSection title="Full bootstrap" id="full"
          description="Real-world main.tsx with all plugins chained. Plugins install in registration order; async installs are awaited before mount.">
          <CodeBlock code={FULL_CODE} language="typescript" />
        </DocSection>

        <DocSection title="Plugin system" id="plugins"
          description="A plugin is a factory returning a LiteForgePlugin. Plugins provide values, consume other plugins via resolve(), and return cleanup functions.">
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
        </DocSection>

        <DocSection title="use() — consuming plugins in components" id="use"
          description="Any value registered via provide() is accessible in component setup() via use(). Fully typed via Declaration Merging on PluginRegistry.">
          <CodeBlock code={USE_CODE} language="typescript" />
        </DocSection>

        <DocSection title="context — static app values" id="context"
          description="Pass arbitrary values at app level. Useful for environment config, feature flags, or shared constants that don't need a full plugin.">
          <CodeBlock code={CONTEXT_CODE} language="typescript" />
        </DocSection>

        <DocSection title="stores — pre-initialized state" id="stores"
          description="Stores passed to createApp() are initialized before any component mounts. All components get the same singleton instance via use().">
          <CodeBlock code={STORES_CODE} language="typescript" />
        </DocSection>

        <DocSection title="debug mode & $lf" id="debug"
          description="debug: true exposes window.$lf for console inspection. Required for @liteforge/devtools to connect.">
          <CodeBlock code={DEBUG_CODE} language="typescript" />
        </DocSection>

        <DocSection title="Thenable & async mount" id="thenable"
          description="AppBuilder implements .then()/.catch() — it behaves like a Promise. All three patterns below are equivalent.">
          <CodeBlock code={THENABLE_CODE} language="typescript" />
        </DocSection>

        <DocSection title="app.destroy()" id="destroy"
          description="Unmounts the app and runs all plugin cleanups in reverse registration order. Useful in tests or SPAs that swap roots.">
          <CodeBlock code={DESTROY_CODE} language="typescript" />
        </DocSection>

        <DocSection title="createApp() options" id="api">
          <ApiTable rows={CREATE_APP_API} />
        </DocSection>

        <DocSection title="AppBuilder methods" id="builder-api">
          <ApiTable rows={BUILDER_API} />
        </DocSection>

        <DocSection title="LiteForgePlugin" id="plugin-api">
          <ApiTable rows={PLUGIN_API} />
        </DocSection>

        <DocSection title="PluginContext (install argument)" id="plugin-ctx-api">
          <ApiTable rows={PLUGIN_CTX_API} />
        </DocSection>

        <DocSection title="App instance" id="app-api">
          <ApiTable rows={APP_API} />
        </DocSection>
      </div>
    );
  },
});

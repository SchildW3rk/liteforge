import { createComponent, use } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

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
$lf.stores        // all registered stores by name
$lf.router        // current router instance
$lf.context       // full app context (plugins + custom values)
$lf.snapshot()    // full state snapshot of all stores
$lf.unmount()     // unmount the app programmatically

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

const DESTROY_CODE = `// app.unmount() unmounts the component tree and calls all plugin cleanups
const app = await createApp({ root: App, target: '#app' })
  .use(routerPlugin(r))
  .mount();

// Later:
app.unmount();   // router cleanup → modal cleanup → … (reverse order)`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export const AppPage = createComponent({
  name: 'AppPage',
  component() {
    const { t } = use('i18n');

    const getCreateAppApi = (): ApiRow[] => [
      { name: 'root', type: 'ComponentFactory', description: t('app.apiRoot') },
      { name: 'target', type: 'string | HTMLElement', description: t('app.apiTarget') },
      { name: 'stores', type: 'AnyStore[]', default: '[]', description: t('app.apiStores') },
      { name: 'context', type: 'Record<string, unknown>', default: '{}', description: t('app.apiContext') },
      { name: 'debug', type: 'boolean', default: 'false', description: t('app.apiDebug') },
      { name: 'onReady', type: '(app: AppInstance) => void', description: t('app.apiOnReady') },
      { name: 'errorComponent', type: 'ErrorComponent', description: t('app.apiErrorComponent') },
      { name: 'onError', type: 'ErrorHandler', description: t('app.apiOnError') },
    ];

    const getBuilderApi = (): ApiRow[] => [
      { name: '.use(plugin)', type: 'AppBuilder', description: t('app.builderUse') },
      { name: '.useDev(factory)', type: 'AppBuilder', description: t('app.builderUseDev') },
      { name: '.mount()', type: 'Promise<App>', description: t('app.builderMount') },
      { name: '.then(fn)', type: 'Promise<App>', description: t('app.builderThen') },
      { name: '.catch(fn)', type: 'Promise<App>', description: t('app.builderCatch') },
    ];

    const getPluginApi = (): ApiRow[] => [
      { name: 'name', type: 'string', description: t('app.pluginName') },
      { name: 'install(ctx)', type: 'void | (() => void) | Promise<void | (() => void)>', description: t('app.pluginInstall') },
    ];

    const getPluginCtxApi = (): ApiRow[] => [
      { name: 'provide(key, value)', type: 'void', description: t('app.ctxProvide') },
      { name: 'resolve(key)', type: 'PluginRegistry[K]', description: t('app.ctxResolve') },
      { name: 'target', type: 'HTMLElement', description: t('app.ctxTarget') },
    ];

    const getAppApi = (): ApiRow[] => [
      { name: 'unmount()', type: 'void', description: t('app.appUnmount') },
      { name: 'use(key)', type: 'T', description: t('app.appUse') },
      { name: 'stores', type: 'Record<string, AnyStore>', description: t('app.appStores') },
      { name: 'router?', type: 'RouterLike', description: t('app.appRouter') },
    ];

    setToc([
      { id: 'minimal',      label: () => t('app.minimal'),      level: 2 },
      { id: 'full',         label: () => t('app.full'),         level: 2 },
      { id: 'plugins',      label: () => t('app.plugins'),      level: 2 },
      { id: 'use',          label: () => t('app.use'),          level: 2 },
      { id: 'context',      label: () => t('app.context'),      level: 2 },
      { id: 'stores',       label: () => t('app.stores'),       level: 2 },
      { id: 'debug',        label: () => t('app.debug'),        level: 2 },
      { id: 'thenable',     label: () => t('app.thenable'),     level: 2 },
      { id: 'destroy',      label: () => t('app.unmount'),      level: 2 },
      { id: 'api',          label: () => t('app.apiOptions'),   level: 2 },
      { id: 'builder-api',  label: () => t('app.apiBuilder'),   level: 2 },
      { id: 'plugin-api',   label: () => t('app.apiPlugin'),    level: 2 },
      { id: 'plugin-ctx-api', label: () => t('app.apiCtx'),    level: 2 },
      { id: 'app-api',      label: () => t('app.apiApp'),       level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('app.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            <code class="text-indigo-400 text-sm">createApp()</code> {() => t('app.subtitlePre')}{' '}
            <code class="text-indigo-400 text-sm">Thenable</code> — {() => t('app.subtitleTopLevel')}{' '}
            <code class="text-indigo-400 text-sm">await</code> {() => t('app.subtitleMid')}{' '}
            <code class="text-indigo-400 text-sm">.mount()</code> {() => t('app.subtitleSuffix')}
          </p>
        </div>

        <DocSection title={() => t('app.minimal')} id="minimal">
          <CodeBlock code={MINIMAL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.full')} id="full"
          description={() => t('app.fullDesc')}>
          <CodeBlock code={FULL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.plugins')} id="plugins"
          description={() => t('app.pluginsDesc')}>
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.use')} id="use"
          description={() => t('app.useDesc')}>
          <CodeBlock code={USE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.context')} id="context"
          description={() => t('app.contextDesc')}>
          <CodeBlock code={CONTEXT_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.stores')} id="stores"
          description={() => t('app.storesDesc')}>
          <CodeBlock code={STORES_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.debug')} id="debug"
          description={() => t('app.debugDesc')}>
          <CodeBlock code={DEBUG_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.thenable')} id="thenable"
          description={() => t('app.thenableDesc')}>
          <CodeBlock code={THENABLE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.unmount')} id="destroy"
          description={() => t('app.unmountDesc')}>
          <CodeBlock code={DESTROY_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.apiOptions')} id="api">
          <ApiTable rows={() => getCreateAppApi()} />
        </DocSection>

        <DocSection title={() => t('app.apiBuilder')} id="builder-api">
          <ApiTable rows={() => getBuilderApi()} />
        </DocSection>

        <DocSection title={() => t('app.apiPlugin')} id="plugin-api">
          <ApiTable rows={() => getPluginApi()} />
        </DocSection>

        <DocSection title={() => t('app.apiCtx')} id="plugin-ctx-api">
          <ApiTable rows={() => getPluginCtxApi()} />
        </DocSection>

        <DocSection title={() => t('app.apiApp')} id="app-api">
          <ApiTable rows={() => getAppApi()} />
        </DocSection>
      </div>
    );
  },
});

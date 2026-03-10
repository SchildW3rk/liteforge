import { createApp } from 'liteforge';
import { createBrowserHistory, createRouter } from 'liteforge/router';
import { modalPlugin } from 'liteforge/modal';
import { toastPlugin } from 'liteforge/toast';
import { i18nPlugin } from 'liteforge/i18n';
import { routes } from './router';
import { App } from './App';
import { initTheme } from './stores/theme';
import './styles.css';

// Sync dark/light class on <html> before first render — no flash of wrong theme
initTheme();

// Vite-native locale discovery — cast avoids importing vite/client types which
// conflict with the runtime package's own ImportMeta.env declaration.
type GlobFn = (pattern: string, opts?: { eager?: boolean }) => Record<string, () => Promise<unknown>>;
const locales = ((import.meta as unknown as { glob: GlobFn }).glob)('./locales/*.js');

const history = createBrowserHistory();
const router = createRouter({
  routes,
  history,
  titleTemplate: (title) => title ?? 'LiteForge Docs',
});

await createApp({ root: App, target: '#app', router })
  .use(i18nPlugin({
    defaultLocale: 'en',
    locales,
    fallback: 'en',
    persist: true,
    storageKey: 'lf-docs-locale',
  }))
  .use(modalPlugin())
  .use(toastPlugin({ position: 'bottom-right' }))
  .mount();

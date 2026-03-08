import { createApp } from 'liteforge';
import { createBrowserHistory, createRouter } from 'liteforge/router';
import { ModalProvider } from 'liteforge/modal';
import { routes } from './router';
import { App } from './App';
import { initTheme } from './stores/theme';
import { i18n } from './i18n';
import './styles.css';

// Sync dark/light class on <html> before first render — no flash of wrong theme
initTheme();

// Pre-load locale before mount — prevents flash of untranslated keys (FOUC equivalent)
const initialLocale = i18n.locale();
const preloads: Promise<void>[] = [i18n._load(initialLocale)];
if (initialLocale !== 'en') preloads.push(i18n._loadFallback('en'));
await Promise.all(preloads);

const history = createBrowserHistory();
const router = createRouter({
  routes,
  history,
  titleTemplate: (title) => title ?? 'LiteForge Docs',
});

document.body.appendChild(ModalProvider());

await createApp({
  root: App,
  target: '#app',
  router,
});


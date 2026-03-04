import { createApp } from 'liteforge';
import { createBrowserHistory, createRouter } from 'liteforge/router';
import { ModalProvider } from 'liteforge/modal';
import { routes } from './router.js';
import { App } from './App.js';
import { initTheme } from './stores/theme.js';
import './styles.css';

// Sync dark/light class on <html> before first render — no flash of wrong theme
initTheme();

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


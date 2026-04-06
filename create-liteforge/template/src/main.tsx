import { createApp } from 'liteforge';
import { routerPlugin, createBrowserHistory } from '@liteforge/router';
import { App } from './App';
import { routes } from './router';
import { uiStore } from './stores/ui';
import './styles.css';

uiStore.init();

await createApp({ root: App, target: '#app', stores: [uiStore] })
  .use(routerPlugin({ routes, history: createBrowserHistory() }))
  .mount();

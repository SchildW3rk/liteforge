import type { RouteDefinition } from '@liteforge/router';
import { Layout } from './pages/Layout/index.js';
import { Overview } from './pages/Overview/index.js';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '/', component: Overview, meta: { title: 'LiteForge Docs' } },
      {
        path: '/core',
        component: () => import('./pages/CorePage/index.js'),
        export: 'CorePage',
        meta: { title: 'Core — LiteForge' },
      },
      {
        path: '/runtime',
        component: () => import('./pages/RuntimePage/index.js'),
        export: 'RuntimePage',
        meta: { title: 'runtime — LiteForge' },
      },
      {
        path: '/control-flow',
        component: () => import('./pages/ControlFlowPage/index.js'),
        export: 'ControlFlowPage',
        meta: { title: 'control flow — LiteForge' },
      },
      {
        path: '/router',
        component: () => import('./pages/RouterPage/index.js'),
        export: 'RouterPage',
        meta: { title: 'router — LiteForge' },
      },
      {
        path: '/query',
        component: () => import('./pages/QueryPage/index.js'),
        export: 'QueryPage',
        meta: { title: 'query — LiteForge' },
      },
      {
        path: '/form',
        component: () => import('./pages/FormPage/index.js'),
        export: 'FormPage',
        meta: { title: 'form — LiteForge' },
      },
      {
        path: '/table',
        component: () => import('./pages/TablePage/index.js'),
        export: 'TablePage',
        meta: { title: 'table — LiteForge' },
      },
      {
        path: '/client',
        component: () => import('./pages/ClientPage/index.js'),
        export: 'ClientPage',
        meta: { title: 'client — LiteForge' },
      },
      {
        path: '/calendar',
        component: () => import('./pages/CalendarPage/index.js'),
        export: 'CalendarPage',
        meta: { title: 'calendar — LiteForge' },
      },
      {
        path: '/store',
        component: () => import('./pages/StorePage/index.js'),
        export: 'StorePage',
        meta: { title: 'store — LiteForge' },
      },
      {
        path: '/modal',
        component: () => import('./pages/ModalPage/index.js'),
        export: 'ModalPage',
        meta: { title: 'modal — LiteForge' },
      },
      {
        path: '/toast',
        component: () => import('./pages/ToastPage/index.js'),
        export: 'ToastPage',
        meta: { title: 'toast — LiteForge' },
      },
      {
        path: '/tooltip',
        component: () => import('./pages/TooltipPage/index.js'),
        export: 'TooltipPage',
        meta: { title: 'tooltip — LiteForge' },
      },
      {
        path: '/lifecycle',
        component: () => import('./pages/LifecyclePage/index.js'),
        export: 'LifecyclePage',
        meta: { title: 'Lifecycle — LiteForge' },
      },
      {
        path: '/app',
        component: () => import('./pages/AppPage/index.js'),
        export: 'AppPage',
        meta: { title: 'App Bootstrap — LiteForge' },
      },
      {
        path: '/devtools',
        component: () => import('./pages/DevtoolsPage/index.js'),
        export: 'DevtoolsPage',
        meta: { title: 'devtools — LiteForge' },
      },
      {
        path: '/i18n',
        component: () => import('./pages/I18nPage/index.js'),
        export: 'I18nPage',
        meta: { title: 'i18n — LiteForge' },
      },
      {
        path: '/admin',
        component: () => import('./pages/AdminPage/index.js'),
        export: 'AdminPage',
        meta: { title: 'admin — LiteForge' },
      },
      {
        path: '/benchmark',
        component: () => import('./pages/benchmark/BenchmarkPage.js'),
        export: 'BenchmarkPage',
        meta: { title: 'Benchmark — LiteForge' },
      },
    ],
  },
  // ── Fullscreen demo routes — bypass Layout ──────────────────────────────────
  {
    path: '/demo/calendar',
    component: () => import('./pages/CalendarDemoPage/index.js'),
    export: 'CalendarDemoPage',
    meta: { title: 'Calendar Demo — LiteForge' },
  },
  {
    path: '*',
    component: Overview,
  },
];

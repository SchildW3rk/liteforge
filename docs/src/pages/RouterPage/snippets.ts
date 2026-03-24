// No imports — pure string constants

// Prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

export const SETUP_CODE = `import { createRouter, createBrowserHistory } from '@liteforge/router';
import { createApp } from 'liteforge';
import { App } from './App';

const router = createRouter({
  history: createBrowserHistory(),
  routes: [
    { path: '/',          component: HomePage },
    { path: '/patients',  component: PatientListPage },
    { path: '/patients/:id', component: PatientDetailPage },
    { path: '*',          component: NotFoundPage },
  ],
});

await createApp({ root: App, target: '#app', router });`;

export const NESTED_CODE = `{
  path: '/dashboard',
  component: DashboardLayout,   // renders <RouterOutlet />
  children: [
    { path: '/',          component: DashboardHome },
    { path: '/patients',  component: PatientList },
    { path: '/settings',  component: Settings },
  ],
}`;

export const LAZY_CODE = `// Routes are lazy-loaded automatically — just use inline imports
{
  path: '/reports',
  component: () => import('./pages/Reports.js'),
  export: 'ReportsPage',          // named export from module
  loading: () => <Spinner />,     // shown while loading
  lazy: { delay: 150, timeout: 8000 },
}`;

export const LINK_CODE = `import { Link, RouterOutlet } from '@liteforge/router';

// Renders an <a> tag — activeClass applied when route matches
<Link href="/patients" activeClass="font-bold text-indigo-400">
  Patients
</Link>

// Renders matched child route
<RouterOutlet />`;

export const USE_ROUTER_CODE = `// @liteforge/router augments PluginRegistry — use('router') is typed as Router automatically.

const MyComponent = ${_cc}({
  name: 'MyComponent',
  component({ use }) {
    const router = use('router');  // Router — inferred via Declaration Merging

    // Reactive current route params
    const patientId = computed(() => router.currentRoute()?.params['id'] ?? '');

    // Programmatic navigation
    const goBack = () => router.back();
    const goToPatient = (id: number) => router.navigate(\`/patients/\${id}\`);

    return (
      <div>
        <span>{() => patientId()}</span>
        <button onclick={goBack}>Back</button>
      </div>
    );
  },
});`;

export const GUARD_CODE = `import { defineGuard } from '@liteforge/router';

const authGuard = defineGuard('auth', async ({ to }) => {
  if (!isAuthenticated()) {
    return \`/login?redirect=\${encodeURIComponent(to.path)}\`;
  }
  return true;
  // Return false to cancel navigation entirely
});

// Apply to a route or group
{
  path: '/admin',
  component: AdminLayout,
  guard: authGuard,
  children: [ ... ],
}`;

export const MIDDLEWARE_CODE = `import { defineMiddleware } from '@liteforge/router';

const titleMiddleware = defineMiddleware('title', async (ctx, next) => {
  await next();
  const route = ctx.matched[ctx.matched.length - 1];
  const title = route?.route.meta?.title as string ?? 'MyApp';
  document.title = title;
});

const router = createRouter({
  routes,
  history: createBrowserHistory(),
  middleware: [titleMiddleware],
});`;

export const TYPED_ROUTES_PHASE1_CODE = `// Pass routes as const to activate typed navigation
const routes = [
  { path: '/',             component: Home },
  { path: '/patients',     component: PatientList },
  { path: '/patients/:id', component: PatientDetail },
] as const

const router = createRouter({ routes, history })

// ✓ Valid paths
router.navigate('/')
router.navigate('/patients')
router.navigate('/patients/42')   // Phase 1: fill params manually

// ✗ TypeScript errors
router.navigate('/patiants')      // typo → TS Error
router.navigate('/unknown')       // not in routes → TS Error`;

export const TYPED_ROUTES_PHASE2_CODE = `// Phase 2 — navigate with pattern + typed params object
router.navigate('/patients/:id', { id: '42' })      // ✓ correct key
router.navigate('/patients/:id', { ix: '42' })      // ✗ wrong key → TS Error
router.navigate('/patients/:id')                    // ✗ params required → TS Error
router.navigate('/', { id: '42' })                  // ✗ no params on '/' → TS Error

// Params are encodeURIComponent-encoded automatically
router.navigate('/search/:query', { query: 'hello world' })
// → navigates to /search/hello%20world

// Type utilities are exported for advanced use
import type { FillParams, ExtractRoutePaths, TypedNavigationTarget, ExtractParamPaths } from '@liteforge/router';`;

export const VIEW_TRANSITIONS_CODE = `// Option 1 — Native View Transitions API (CSS-driven, browser-native)
const router = createRouter({
  routes,
  history,
  useViewTransitions: true,   // wraps DOM commit in document.startViewTransition()
})

// Add CSS for the transition (in your stylesheet):
// ::view-transition-old(root) { animation: fade-out 150ms ease; }
// ::view-transition-new(root) { animation: fade-in  150ms ease; }

// Option 2 — Custom hooks (JS-driven, full control)
const router = createRouter({
  routes,
  history,
  transitions: {
    onBeforeLeave: async (el, ctx) => {
      await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 }).finished
    },
    onAfterEnter: (el, ctx) => {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 })
    },
  },
})

// ctx carries: { to: Location, from: Location | null, direction: 'forward' | 'replace' }

// Option 3 — Both together (hooks fire around the view transition)
const router = createRouter({
  routes,
  history,
  useViewTransitions: true,
  transitions: {
    onBeforeLeave: async (el, ctx) => { /* runs before startViewTransition */ },
    onAfterEnter:  (el, ctx) => { /* runs after DOM commit */ },
  },
})`;

export const LAZY_WRAPPER_CODE = `import { lazy } from '@liteforge/router';

{
  path: '/reports',
  component: lazy(() => import('./pages/Reports.js'), {
    delay:       150,     // ms before showing loading state
    timeout:     8000,    // ms before showing error state
    minLoadTime: 300,     // minimum time to show loading (prevents flash)
    loading: () => <Spinner />,
    error:   (err, retry) => <button onclick={retry}>Retry</button>,
  }),
}`;

export const LAZY_CHILDREN_CODE = `// Load entire route subtrees on demand
{
  path: '/admin',
  component: AdminLayout,
  lazyChildren: () => import('./admin-routes.js').then(m => m.adminRoutes),
  // adminRoutes is a RouteDefinition[] exported from admin-routes.js
  // Loaded once on first match, then cached
}`;

export const ROUTER_DEMO_CODE = `type Tab = 'home' | 'patients' | 'settings';

const RouterDemo = ${_cc}({
  name: 'RouterDemo',
  component() {
    const active    = signal<Tab>('home');
    const patientId = signal<number | null>(null);

    return (
      <div class="space-y-4">
        <nav class="flex gap-1 p-1 rounded-lg bg-[var(--surface-overlay)]/60">
          {For({
            each: TABS,
            key: t => t.id,
            children: tab => (
              <button
                class={() => tab.id === active() ? 'active-class' : 'default-class'}
                onclick={() => { active.set(tab.id); patientId.set(null); }}
              >
                {tab.label}
              </button>
            ),
          })}
        </nav>

        {Show({
          when: () => patientId() !== null,
          children: () => <p>{() => \`Viewing patient #\${patientId()}\`}</p>,
        })}

        <button onclick={() => { active.set('settings'); patientId.set(null); }}>
          router.navigate("/settings")
        </button>
      </div>
    );
  },
});`;

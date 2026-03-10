import { createComponent, For, Show, use } from 'liteforge';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import { LiveExample } from '../components/LiveExample.js';
import { btnClass } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

// ─── Live example ──────────────────────────────────────────────────────────────

type Tab = 'home' | 'patients' | 'settings';

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'home',     label: 'Home',     path: '/' },
  { id: 'patients', label: 'Patients', path: '/patients' },
  { id: 'settings', label: 'Settings', path: '/settings' },
];

const CONTENT: Record<Tab, string> = {
  home:     'Welcome to MyApp. Navigate using the tabs above.',
  patients: 'Patient list — click a patient to see their detail view.',
  settings: 'Settings panel — configure your preferences here.',
};

const PATIENTS = [
  { id: 101, name: 'Anna Müller' },
  { id: 102, name: 'Tom Weber' },
  { id: 103, name: 'Clara Huber' },
];

const RouterDemo = createComponent({
  name: 'RouterDemo',
  component() {
    const active    = signal<Tab>('home');
    const patientId = signal<number | null>(null);

    const currentPath = () => {
      const base = TABS.find(t => t.id === active())!.path;
      const id   = patientId();
      return id !== null ? `${base}/${id}` : base;
    };

    const navigate = (tab: Tab) => { active.set(tab); patientId.set(null); };

    return (
      <div class="space-y-4">
        {/* Tab nav */}
        <nav class="flex gap-1 p-1 rounded-lg bg-[var(--surface-overlay)]/60 w-fit">
          {For({
            each: TABS,
            key: t => t.id,
            children: tab => (
              <button
                class={() =>
                  tab.id === active()
                    ? 'px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-[var(--content-primary)] transition-colors'
                    : 'px-3 py-1.5 rounded-md text-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors'
                }
                onclick={() => navigate(tab.id)}
              >
                {tab.label}
              </button>
            ),
          })}
        </nav>

        {/* Simulated URL bar */}
        <div class="flex items-center gap-1 px-3 py-2 rounded-md bg-[var(--surface-raised)] border border-[var(--line-default)]">
          <span class="text-xs text-[var(--content-subtle)] font-mono">https://myapp.dev</span>
          <span class="text-xs text-indigo-400 font-mono">{() => currentPath()}</span>
        </div>

        {/* Content panel */}
        <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-sunken)] min-h-20 space-y-2">
          {Show({
            when: () => patientId() === null,
            children: () => (
              <p class="text-sm text-[var(--content-secondary)]">{() => CONTENT[active()]}</p>
            ),
          })}

          {/* Patient list — only on patients tab */}
          {Show({
            when: () => active() === 'patients' && patientId() === null,
            children: () => (
              <div class="mt-1 space-y-1">
                {For({
                  each: PATIENTS,
                  key: p => p.id,
                  children: p => (
                    <button
                      class="block w-full text-left px-3 py-1.5 rounded text-sm text-[var(--content-secondary)] hover:bg-[var(--surface-overlay)] transition-colors"
                      onclick={() => patientId.set(p.id)}
                    >
                      {p.name} →
                    </button>
                  ),
                })}
              </div>
            ),
          })}

          {/* Patient detail */}
          {Show({
            when: () => patientId() !== null,
            children: () => (
              <div class="space-y-2">
                <div class="p-3 rounded border border-emerald-500/30 bg-emerald-950/20 text-sm text-emerald-300">
                  {() => `Patient #${patientId()} — params: { id: "${patientId()}" }`}
                </div>
                <button
                  class="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  onclick={() => patientId.set(null)}
                >
                  ← Back to patients
                </button>
              </div>
            ),
          })}
        </div>

        {/* Programmatic navigation */}
        <button
          class={btnClass('secondary', 'sm')}
          onclick={() => navigate('settings')}
        >
          router.navigate("/settings")
        </button>
      </div>
    );
  },
});

// ─── Code strings ──────────────────────────────────────────────────────────────

// Prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

const SETUP_CODE = `import { createRouter, createBrowserHistory } from 'liteforge/router';
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

const NESTED_CODE = `{
  path: '/dashboard',
  component: DashboardLayout,   // renders <RouterOutlet />
  children: [
    { path: '/',          component: DashboardHome },
    { path: '/patients',  component: PatientList },
    { path: '/settings',  component: Settings },
  ],
}`;

const LAZY_CODE = `// Routes are lazy-loaded automatically — just use inline imports
{
  path: '/reports',
  component: () => import('./pages/Reports.js'),
  export: 'ReportsPage',          // named export from module
  loading: () => <Spinner />,     // shown while loading
  lazy: { delay: 150, timeout: 8000 },
}`;

const LINK_CODE = `import { Link, RouterOutlet } from 'liteforge/router';

// Renders an <a> tag — activeClass applied when route matches
<Link href="/patients" activeClass="font-bold text-indigo-400">
  Patients
</Link>

// Renders matched child route
<RouterOutlet />`;

const USE_ROUTER_CODE = `// @liteforge/router augments PluginRegistry — use('router') is typed as Router automatically.

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

const GUARD_CODE = `import { defineGuard } from 'liteforge/router';

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

const MIDDLEWARE_CODE = `import { defineMiddleware } from 'liteforge/router';

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

const TYPED_ROUTES_PHASE1_CODE = `// Pass routes as const to activate typed navigation
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

const TYPED_ROUTES_PHASE2_CODE = `// Phase 2 — navigate with pattern + typed params object
router.navigate('/patients/:id', { id: '42' })      // ✓ correct key
router.navigate('/patients/:id', { ix: '42' })      // ✗ wrong key → TS Error
router.navigate('/patients/:id')                    // ✗ params required → TS Error
router.navigate('/', { id: '42' })                  // ✗ no params on '/' → TS Error

// Params are encodeURIComponent-encoded automatically
router.navigate('/search/:query', { query: 'hello world' })
// → navigates to /search/hello%20world

// Type utilities are exported for advanced use
import type { FillParams, ExtractRoutePaths, TypedNavigationTarget, ExtractParamPaths } from 'liteforge/router';`;

const VIEW_TRANSITIONS_CODE = `// Option 1 — Native View Transitions API (CSS-driven, browser-native)
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

const LAZY_WRAPPER_CODE = `import { lazy } from 'liteforge/router';

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

const LAZY_CHILDREN_CODE = `// Load entire route subtrees on demand
{
  path: '/admin',
  component: AdminLayout,
  lazyChildren: () => import('./admin-routes.js').then(m => m.adminRoutes),
  // adminRoutes is a RouteDefinition[] exported from admin-routes.js
  // Loaded once on first match, then cached
}`;

const ROUTER_DEMO_CODE = `type Tab = 'home' | 'patients' | 'settings';

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

export const RouterPage = createComponent({
  name: 'RouterPage',
  component() {
    const { t } = use('i18n');

    const getRouteApi = (): ApiRow[] => [
      { name: 'path', type: 'string', description: t('router.apiPath') },
      { name: 'component', type: 'ComponentFactory | () => Promise', description: t('router.apiComponent') },
      { name: 'export', type: 'string', description: t('router.apiExport') },
      { name: 'guard', type: 'RouteGuard | RouteGuard[]', description: t('router.apiGuard') },
      { name: 'children', type: 'RouteDefinition[]', description: t('router.apiChildren') },
      { name: 'meta', type: 'Record<string, unknown>', description: t('router.apiMeta') },
      { name: 'loading', type: '() => Node', description: t('router.apiLoading') },
      { name: 'lazy', type: '{ delay?, timeout? }', description: t('router.apiLazy') },
    ];

    setToc([
      { id: 'setup',            label: () => t('router.setup'),            level: 2 },
      { id: 'nested',           label: () => t('router.nested'),           level: 2 },
      { id: 'lazy',             label: () => t('router.lazy'),             level: 2 },
      { id: 'link',             label: () => t('router.link'),             level: 2 },
      { id: 'params',           label: () => t('router.useRouter'),        level: 2 },
      { id: 'guards',           label: () => t('router.guards'),           level: 2 },
      { id: 'middleware',       label: () => t('router.middleware'),       level: 2 },
      { id: 'typed-routes',     label: () => t('router.typedRoutes'),      level: 2 },
      { id: 'view-transitions', label: () => t('router.viewTransitions'),  level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/router</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('router.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('router.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/router`} language="bash" />
          <CodeBlock code={`import { createRouter, createBrowserHistory, Link, RouterOutlet } from 'liteforge/router';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('router.setup')}
          id="setup"
          description={() => t('router.setupDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getRouteApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.nested')}
          id="nested"
          description={() => t('router.nestedDesc')}
        >
          <CodeBlock code={NESTED_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.lazy')}
          id="lazy"
          description={() => t('router.lazyDesc')}
        >
          <div>
            <CodeBlock code={LAZY_CODE} language="typescript" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-1">{() => t('router.lazyWrapper')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.lazyWrapperDesc')}</p>
            <CodeBlock code={LAZY_WRAPPER_CODE} language="tsx" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-1">{() => t('router.lazyChildren')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.lazyChildrenDesc')}</p>
            <CodeBlock code={LAZY_CHILDREN_CODE} language="typescript" />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.link')}
          id="link"
          description={() => t('router.linkDesc')}
        >
          <CodeBlock code={LINK_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('router.useRouter')}
          id="params"
          description={() => t('router.useRouterDesc')}
        >
          <div>
            <CodeBlock code={USE_ROUTER_CODE} language="tsx" />
            <LiveExample
              title={() => t('router.liveTitle')}
              description={() => t('router.liveDesc')}
              component={RouterDemo}
              code={ROUTER_DEMO_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.guards')}
          id="guards"
          description={() => t('router.guardsDesc')}
        >
          <CodeBlock code={GUARD_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.middleware')}
          id="middleware"
          description={() => t('router.middlewareDesc')}
        >
          <CodeBlock code={MIDDLEWARE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.typedRoutes')}
          id="typed-routes"
          description={() => t('router.typedRoutesDesc')}
        >
          <div>
            <p class="text-sm font-medium text-[var(--content-secondary)] mb-2">{() => t('router.typedRoutesPhase1')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.typedRoutesPhase1Desc')}</p>
            <CodeBlock code={TYPED_ROUTES_PHASE1_CODE} language="typescript" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-2">{() => t('router.typedRoutesPhase2')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.typedRoutesPhase2Desc')}</p>
            <CodeBlock code={TYPED_ROUTES_PHASE2_CODE} language="typescript" />
            <p class="text-xs text-[var(--content-subtle)] mt-3 italic">{() => t('router.typedRoutesNote')}</p>
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.viewTransitions')}
          id="view-transitions"
          description={() => t('router.viewTransitionsDesc')}
        >
          <div>
            <CodeBlock code={VIEW_TRANSITIONS_CODE} language="typescript" />
            <p class="text-xs text-[var(--content-subtle)] mt-1 italic">{() => t('router.viewTransitionsNote')}</p>
          </div>
        </DocSection>
      </div>
    );
  },
});

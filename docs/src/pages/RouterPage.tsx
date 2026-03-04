import { createComponent, For, Show } from 'liteforge';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import { LiveExample } from '../components/LiveExample.js';
import { btnClass } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';

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
import { App } from './App.js';

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

// ─── API rows ──────────────────────────────────────────────────────────────────

const ROUTE_API: ApiRow[] = [
  { name: 'path', type: 'string', description: 'Route path. Use :param for dynamic segments, * for wildcard' },
  { name: 'component', type: 'ComponentFactory | () => Promise', description: 'Component factory or lazy import function' },
  { name: 'export', type: 'string', description: 'Named export to use from a lazy-loaded module' },
  { name: 'guard', type: 'RouteGuard | RouteGuard[]', description: 'Guard(s) that must pass before navigation completes' },
  { name: 'children', type: 'RouteDefinition[]', description: 'Nested routes rendered inside parent\'s RouterOutlet' },
  { name: 'meta', type: 'Record<string, unknown>', description: 'Arbitrary metadata accessible in middleware and guards' },
  { name: 'loading', type: '() => Node', description: 'Component shown while lazy module is loading' },
  { name: 'lazy', type: '{ delay?, timeout? }', description: 'Override global lazy loading config for this route' },
];

export const RouterPage = createComponent({
  name: 'RouterPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/router</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Router</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Client-side routing with nested routes, lazy loading, route guards, and middleware.
            The docs app you're reading uses it right now.
          </p>
          <CodeBlock code={`pnpm add @liteforge/router`} language="bash" />
          <CodeBlock code={`import { createRouter, createBrowserHistory, Link, RouterOutlet } from 'liteforge/router';`} language="typescript" />
        </div>

        <DocSection
          title="Setup"
          id="setup"
          description="Create a router instance and pass it to createApp(). Routes are matched top-to-bottom."
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={ROUTE_API} />
          </div>
        </DocSection>

        <DocSection
          title="Nested routes"
          id="nested"
          description="Parent components render RouterOutlet() where child routes are mounted. Useful for layouts with sidebars, tabs, or shared headers."
        >
          <CodeBlock code={NESTED_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Lazy loading"
          id="lazy"
          description="Use inline import() expressions directly in route definitions — the router handles wrapping automatically."
        >
          <CodeBlock code={LAZY_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Link & RouterOutlet"
          id="link"
          description="Link renders an <a> tag with active state detection. RouterOutlet is where matched child routes render."
        >
          <CodeBlock code={LINK_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title="Accessing the router (use)"
          id="params"
          description="Inside a component, call use('router') to get the router instance. Route params are reactive — read them via computed() on currentRoute()."
        >
          <div>
            <CodeBlock code={USE_ROUTER_CODE} language="tsx" />
            <LiveExample
              title="Router demo"
              description="Active links, route params, programmatic navigation"
              component={RouterDemo}
              code={ROUTER_DEMO_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title="Guards"
          id="guards"
          description="Guards run before navigation completes. Return true to allow, a redirect path to redirect, or false to cancel."
        >
          <CodeBlock code={GUARD_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Middleware"
          id="middleware"
          description="Middleware wraps every navigation. Use it for logging, document title updates, analytics, or scroll restoration."
        >
          <CodeBlock code={MIDDLEWARE_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});

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

interface Post { id: number; title: string; body: string; }

const FetchDemo = createComponent({
  name: 'FetchDemo',
  component() {
    const loading = signal(false);
    const error   = signal<string | null>(null);
    const posts   = signal<Post[]>([]);
    const page    = signal(1);

    const fetchPosts = async () => {
      loading.set(true);
      error.set(null);
      try {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/posts?_page=${page()}&_limit=3`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        posts.set(await res.json());
      } catch (e) {
        error.set(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        loading.set(false);
      }
    };

    const simulateError = () => {
      loading.set(false);
      error.set('HTTP 404: Not Found (simulated ApiError)');
      posts.set([]);
    };

    const prev = () => { if (page() > 1) { page.update(p => p - 1); fetchPosts(); } };
    const next = () => { page.update(p => p + 1); fetchPosts(); };

    return (
      <div class="space-y-3">
        {/* Controls */}
        <div class="flex items-center gap-2">
          <button class={btnClass('primary', 'sm')} onclick={fetchPosts}>
            Fetch posts
          </button>
          <button class={btnClass('secondary', 'sm')} onclick={simulateError}>
            Simulate error
          </button>
          <button class={btnClass('secondary', 'sm')} onclick={prev}>←</button>
          <span class="text-xs text-[var(--content-muted)] font-mono">{() => `page ${page()}`}</span>
          <button class={btnClass('secondary', 'sm')} onclick={next}>→</button>
        </div>

        {/* Loading */}
        {Show({
          when: loading,
          children: () => (
            <p class="text-sm text-[var(--content-secondary)] animate-pulse py-1">Loading...</p>
          ),
        })}

        {/* Error */}
        {Show({
          when: () => error() !== null,
          children: () => (
            <div class="p-3 rounded border border-red-500/30 bg-red-950/20 text-sm text-red-300">
              {() => error()}
            </div>
          ),
        })}

        {/* Posts */}
        {Show({
          when: () => posts().length > 0,
          children: () => (
            <div class="space-y-2">
              {For({
                each: posts,
                key: p => p.id,
                children: post => (
                  <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/60">
                    <p class="text-xs font-medium text-[var(--content-primary)] mb-1">
                      {() => `#${post.id} ${post.title}`}
                    </p>
                    <p class="text-xs text-[var(--content-muted)] line-clamp-2">{post.body}</p>
                  </div>
                ),
              })}
            </div>
          ),
        })}

        {/* Empty state */}
        {Show({
          when: () => !loading() && error() === null && posts().length === 0,
          children: () => (
            <p class="text-sm text-[var(--content-subtle)] py-1">
              Click "Fetch posts" to load data from jsonplaceholder.typicode.com
            </p>
          ),
        })}
      </div>
    );
  },
});

// ─── Code strings ──────────────────────────────────────────────────────────────

// Prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

const SETUP_CODE = `import { createClient } from 'liteforge/client';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: { 'X-App-Version': '1.0' },
  timeout: 15_000,
  retry: 2,
});

// Shorthand HTTP methods
const user = await client.get<User>('/users/42');
const created = await client.post<User>('/users', { name: 'Anna' });
await client.delete('/users/42');`;

const RESOURCE_CODE = `const patients = client.resource<Patient, NewPatient>('patients');

// Typed CRUD operations
const list    = await patients.getList({ page: 1, pageSize: 20 });
const patient = await patients.getOne(42);
const created = await patients.create({ name: 'Anna', dob: '1990-01-15' });
const updated = await patients.update(42, { name: 'Anna M.' });
await patients.delete(42);

// Custom actions
await patients.action('discharge', { reason: 'recovered' }, 42);
// → POST /patients/42/discharge

// Raw request within resource path
await patients.custom({ method: 'GET', path: 'count' });
// → GET /patients/count`;

const QUERY_CLIENT_CODE = `import { createClient } from 'liteforge/client';
import { createQuery, createMutation } from 'liteforge/query';

// createClient with query → returns QueryClient
// resource() returns QueryResource — use* methods guaranteed, no ! needed
const client = createClient({
  baseUrl: 'https://api.example.com',
  query: { createQuery, createMutation },
});

const patients = client.resource<Patient, NewPatient>('patients');

// TypeScript knows these exist — no optional chaining needed
const listQuery  = patients.useList(() => ({ page: page(), pageSize: 20 }));
const oneQuery   = patients.useOne(42);
const createMut  = patients.useCreate();
const updateMut  = patients.useUpdate();
const deleteMut  = patients.useDelete();

listQuery.data()       // Patient[] | undefined (via ListResponse)
listQuery.isLoading()  // boolean
createMut.mutate({ name: 'Anna', dob: '1990-01-15' });`;

const ERROR_CODE = `import { ApiError } from 'liteforge/client';

try {
  const patient = await client.get<Patient>('/patients/99');
} catch (e) {
  if (e instanceof ApiError) {
    console.log(e.status);   // 404
    console.log(e.message);  // "Not Found"
    console.log(e.data);     // parsed response body (if any)
  }
}

// Handle globally via interceptor
client.addInterceptor({
  onResponseError: async (error) => {
    if (error.status === 401) {
      await refreshToken();
      return error.retry();  // re-run the original request
    }
    if (error.status === 403) {
      router.navigate('/forbidden');
      throw error;
    }
    throw error;
  },
});`;

const INTERCEPTOR_CODE = `// Auth token injection
client.addInterceptor({
  onRequest: (config) => ({
    ...config,
    headers: { ...config.headers, Authorization: \`Bearer \${getToken()}\` },
  }),
});

// 401 → refresh token and retry
client.addInterceptor({
  onResponseError: async (error) => {
    if (error.status === 401) {
      await refreshToken();
      return error.retry();
    }
    throw error;
  },
});

// Remove an interceptor
const remove = client.addInterceptor({ onRequest: logRequest });
remove();`;

const MIDDLEWARE_CODE = `const timingMiddleware: Middleware = async (config, next) => {
  const start = performance.now();
  const result = await next(config);
  console.log(\`\${config.method} \${config.url} — \${(performance.now() - start).toFixed(0)}ms\`);
  return result;
};

client.use(timingMiddleware);`;

const CONTRAST_CODE = `// ❌ Level 1: Manual fetch — maximum boilerplate
const patients = signal<Patient[]>([]);
const loading  = signal(false);
const error    = signal<Error | null>(null);

async function fetchPatients() {
  loading.set(true);
  try {
    const res = await fetch('/api/patients', {
      headers: { Authorization: \`Bearer \${token}\` },
    });
    if (!res.ok) throw new Error(res.statusText);
    patients.set(await res.json());
  } catch (e) { error.set(e as Error); }
  finally { loading.set(false); }
}

// ✓ Level 2: createClient — DX improvement
const patient = await client.get<Patient>('/patients/42');

// ✓ Level 3: resource() — typed CRUD, no URL strings
const patient = await client.resource<Patient>('patients').getOne(42);

// ✓ Level 4: QueryClient — reactive, cached, no state management
const query = client.resource<Patient>('patients').useOne(42);
query.data(); query.isLoading(); query.error();`;

const FETCH_DEMO_CODE = `const FetchDemo = ${_cc}({
  name: 'FetchDemo',
  component() {
    const loading = signal(false);
    const error   = signal<string | null>(null);
    const posts   = signal<Post[]>([]);

    const fetchPosts = async () => {
      loading.set(true);
      error.set(null);
      try {
        posts.set(await client.get<Post[]>('/posts?_limit=3'));
      } catch (e) {
        if (e instanceof ApiError) error.set(\`HTTP \${e.status}: \${e.message}\`);
      } finally {
        loading.set(false);
      }
    };

    return (
      <div class="space-y-3">
        <button onclick={fetchPosts}>Fetch posts</button>
        {Show({ when: loading, children: () => <p>Loading...</p> })}
        {Show({
          when: () => error() !== null,
          children: () => <p class="text-red-400">{() => error()}</p>,
        })}
        {For({
          each: posts,
          key: p => p.id,
          children: post => <div>{post.title}</div>,
        })}
      </div>
    );
  },
});`;

export const ClientPage = createComponent({
  name: 'ClientPage',
  component() {
    const { t } = use('i18n');

    const getClientApi = (): ApiRow[] => [
      { name: 'baseUrl', type: 'string', description: t('client.apiBaseUrl') },
      { name: 'headers', type: 'Record<string, string>', default: '{}', description: t('client.apiHeaders') },
      { name: 'timeout', type: 'number', default: '30000', description: t('client.apiTimeout') },
      { name: 'retry', type: 'number', default: '0', description: t('client.apiRetry') },
      { name: 'query', type: '{ createQuery, createMutation }', default: 'undefined', description: t('client.apiQuery') },
    ];

    setToc([
      { id: 'contrast',      label: () => t('client.progressiveDx'),  level: 2 },
      { id: 'create-client', label: () => t('client.createClient'),   level: 2 },
      { id: 'resource',      label: () => t('client.resource'),       level: 2 },
      { id: 'query-client',  label: () => t('client.queryClient'),    level: 2 },
      { id: 'errors',        label: () => t('client.errors'),         level: 2 },
      { id: 'interceptors',  label: () => t('client.interceptors'),   level: 2 },
      { id: 'middleware',    label: () => t('client.middleware'),      level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/client</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('client.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('client.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/client`} language="bash" />
          <CodeBlock code={`import { createClient, ApiError } from 'liteforge/client';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('client.progressiveDx')}
          id="contrast"
          description={() => t('client.progressiveDxDesc')}
        >
          <CodeBlock code={CONTRAST_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.createClient')}
          id="create-client"
          description={() => t('client.createClientDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getClientApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('client.resource')}
          id="resource"
          description={() => t('client.resourceDesc')}
        >
          <CodeBlock code={RESOURCE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.queryClient')}
          id="query-client"
          description={() => t('client.queryClientDesc')}
        >
          <CodeBlock code={QUERY_CLIENT_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.errors')}
          id="errors"
          description={() => t('client.errorsDesc')}
        >
          <div>
            <CodeBlock code={ERROR_CODE} language="typescript" />
            <LiveExample
              title={() => t('client.liveTitle')}
              description={() => t('client.liveDesc')}
              component={FetchDemo}
              code={FETCH_DEMO_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('client.interceptors')}
          id="interceptors"
          description={() => t('client.interceptorsDesc')}
        >
          <CodeBlock code={INTERCEPTOR_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.middleware')}
          id="middleware"
          description={() => t('client.middlewareDesc')}
        >
          <CodeBlock code={MIDDLEWARE_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});

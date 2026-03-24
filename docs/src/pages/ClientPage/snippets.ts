// No imports — pure string constants

// Prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

export const SETUP_CODE = `import { createClient } from '@liteforge/client';

const client = createClient({
  baseUrl: 'https://api.example.com',
  headers: { 'X-App-Version': '1.0' },
  timeout: 15_000,
  retry: 2,
});

// Shorthand HTTP methods
const user = await client.get<User>('/users/42');
const created = await client.post<User>('/users', { name: 'Anna' });
await client.delete('/users/42');`

export const RESOURCE_CODE = `const patients = client.resource<Patient, NewPatient>('patients');

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
// → GET /patients/count`

export const QUERY_CLIENT_CODE = `import { createClient } from '@liteforge/client';
import { createQuery, createMutation } from '@liteforge/query';

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
createMut.mutate({ name: 'Anna', dob: '1990-01-15' });`

export const ERROR_CODE = `import { ApiError } from '@liteforge/client';

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
});`

export const INTERCEPTOR_CODE = `// Auth token injection
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
remove();`

export const MIDDLEWARE_CODE = `const timingMiddleware: Middleware = async (config, next) => {
  const start = performance.now();
  const result = await next(config);
  console.log(\`\${config.method} \${config.url} — \${(performance.now() - start).toFixed(0)}ms\`);
  return result;
};

client.use(timingMiddleware);`

export const CONTRAST_CODE = `// ❌ Level 1: Manual fetch — maximum boilerplate
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
query.data(); query.isLoading(); query.error();`

export const FETCH_DEMO_CODE = `const FetchDemo = ${_cc}({
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
});`

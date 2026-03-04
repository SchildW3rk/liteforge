import { createComponent } from '@liteforge/runtime';
import { signal } from '@liteforge/core';
import { createQuery } from '@liteforge/query';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example ─────────────────────────────────────────────────────────────

function QueryExample(): Node {
  const postId = signal(1);

  const post = createQuery({
    key: () => ['post', postId()],
    fn: () => fetch(`https://jsonplaceholder.typicode.com/posts/${postId()}`)
      .then(r => r.json()) as Promise<{ id: number; title: string; body: string }>,
    staleTime: 30_000,
  });

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const nav = document.createElement('div');
  nav.className = 'flex items-center gap-2';

  const prev = document.createElement('button');
  prev.className = 'px-3 py-1 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors';
  prev.textContent = '← Prev';
  prev.addEventListener('click', () => postId.update(id => Math.max(1, id - 1)));

  const next = document.createElement('button');
  next.className = 'px-3 py-1 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors';
  next.textContent = 'Next →';
  next.addEventListener('click', () => postId.update(id => id + 1));

  const label = document.createElement('span');
  label.className = 'text-xs text-[var(--content-muted)] font-mono';

  import('@liteforge/core').then(({ effect }) => {
    effect(() => { label.textContent = `post #${postId()}`; });

    const status = document.createElement('div');
    status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block';

    const content = document.createElement('div');
    content.className = 'p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm text-[var(--content-secondary)] min-h-16';

    effect(() => {
      if (post.isLoading()) {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-yellow-950 text-yellow-300';
        status.textContent = 'Loading…';
        content.textContent = '…';
      } else if (post.error() !== undefined) {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-red-950 text-red-300';
        status.textContent = 'Error';
        content.textContent = post.error()?.message ?? 'Unknown error';
      } else {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-emerald-950 text-emerald-300';
        status.textContent = 'Cached';
        const p = post.data();
        if (p !== undefined) {
          content.textContent = `"${(p as { title: string }).title}"`;
        }
      }
    });

    wrap.appendChild(status);
    wrap.appendChild(content);
  });

  nav.appendChild(prev);
  nav.appendChild(next);
  nav.appendChild(label);
  wrap.insertBefore(nav, wrap.firstChild);
  return wrap;
}

// ─── Code strings ─────────────────────────────────────────────────────────────

const QUERY_CODE = `import { createQuery } from '@liteforge/query';

const patients = createQuery({
  key: 'patients',
  fn: () => fetch('/api/patients').then(r => r.json()),
  staleTime: 5 * 60 * 1000,  // fresh for 5 min
});

// In component:
patients.data()      // Patient[] | undefined
patients.isLoading() // boolean
patients.error()     // Error | undefined
patients.refetch()   // force refresh`;

const REACTIVE_KEY_CODE = `import { signal, computed } from '@liteforge/core';

const clinicId = signal(1);

// Key is a function → re-fetches automatically when clinicId changes
const patients = createQuery({
  key: () => ['patients', clinicId()],
  fn: () => fetch(\`/api/clinics/\${clinicId()}/patients\`).then(r => r.json()),
});

// Changing clinicId triggers automatic re-fetch
clinicId.set(2);`;

const MUTATION_CODE = `import { createMutation } from '@liteforge/query';

const createPatient = createMutation({
  fn: (data: NewPatient) =>
    fetch('/api/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Automatically refetch these queries after success
  invalidate: ['patients'],
});

// In component:
await createPatient.mutate({ name: 'Anna Müller', dob: '1990-01-15' });
createPatient.isLoading()  // boolean
createPatient.error()      // Error | undefined
createPatient.data()       // created Patient`;

const PROBLEM_CODE = `// ❌ Without @liteforge/query — manual state management
const patients = signal<Patient[]>([]);
const loading  = signal(false);
const error    = signal<Error | null>(null);

async function fetchPatients() {
  loading.set(true);
  error.set(null);
  try {
    patients.set(await fetch('/api/patients').then(r => r.json()));
  } catch (e) {
    error.set(e as Error);
  } finally {
    loading.set(false);
  }
}

// Also: no caching — refetches on every navigation
// Also: must call fetchPatients() manually on mount`;

const SOLUTION_CODE = `// ✅ With @liteforge/query — automatic caching & state
const patients = createQuery({
  key: 'patients',
  fn: () => fetch('/api/patients').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
});

// patients.data(), patients.isLoading(), patients.error()
// Cached — navigating away and back won't re-fetch until stale`;

const LIVE_CODE = `const postId = signal(1);

const post = createQuery({
  key: () => ['post', postId()],
  fn: () => fetch(\`/api/posts/\${postId()}\`).then(r => r.json()),
  staleTime: 30_000,
});

<button onclick={() => postId.update(id => id + 1)}>Next →</button>
<Show when={() => post.isLoading()}>Loading…</Show>
<p>{() => post.data()?.title}</p>`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const QUERY_API: ApiRow[] = [
  { name: 'key', type: 'string | unknown[] | () => unknown[]', description: 'Cache key. Use a function to make it reactive — changes trigger refetch' },
  { name: 'fn', type: '() => Promise<T>', description: 'Async fetch function — called when cache is empty or stale' },
  { name: 'staleTime', type: 'number', default: '0', description: 'Milliseconds before cached data is considered stale' },
  { name: 'enabled', type: 'boolean | () => boolean', default: 'true', description: 'Set to false to prevent fetching' },
];

const MUTATION_API: ApiRow[] = [
  { name: 'fn', type: '(variables: TVariables) => Promise<TData>', description: 'The mutation function — receives variables and returns a promise' },
  { name: 'invalidate', type: 'string[]', default: '[]', description: 'Query keys to invalidate after successful mutation' },
];

export const QueryPage = createComponent({
  name: 'QueryPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/query</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Query & Mutations</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Declarative data fetching with automatic caching, loading/error states, and reactive keys.
            Mutations automatically invalidate related queries so your UI stays in sync.
          </p>
          <CodeBlock code={`pnpm add @liteforge/query`} language="bash" />
          <CodeBlock code={`import { createQuery, createMutation } from '@liteforge/query';`} language="typescript" />
        </div>

        <DocSection
          title="The problem it solves"
          id="problem"
        >
          <div class="space-y-0">
            <CodeBlock code={PROBLEM_CODE} language="typescript" title="❌ Without — manual state" />
            <CodeBlock code={SOLUTION_CODE} language="typescript" title="✅ With @liteforge/query" />
          </div>
        </DocSection>

        <DocSection
          title="createQuery()"
          id="create-query"
          description="Fetches data and caches the result. Returns reactive signals for data, loading, and error state."
        >
          <div>
            <CodeBlock code={QUERY_CODE} language="typescript" />
            <ApiTable rows={QUERY_API} />
          </div>
        </DocSection>

        <DocSection
          title="Reactive keys"
          id="reactive-keys"
          description="Pass a function as key — when any signal inside it changes, the query automatically re-fetches with the new parameters."
        >
          <CodeBlock code={REACTIVE_KEY_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="createMutation()"
          id="mutation"
          description="For write operations (POST, PUT, DELETE). Invalidate related queries on success to keep the cache fresh."
        >
          <div>
            <CodeBlock code={MUTATION_CODE} language="typescript" />
            <ApiTable rows={MUTATION_API} />
          </div>
        </DocSection>

        <DocSection
          title="Live example — reactive pagination"
          id="live"
          description="Click Next/Prev to change postId — the query key changes, a new fetch fires, cached pages are reused."
        >
          <LiveExample
            title="createQuery with reactive key"
            component={QueryExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});

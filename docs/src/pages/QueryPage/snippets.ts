// No imports — pure string constants

export const QUERY_CODE = `import { createQuery } from '@liteforge/query';

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

export const REACTIVE_KEY_CODE = `import { signal, computed } from 'liteforge';

const clinicId = signal(1);

// Key is a function → re-fetches automatically when clinicId changes
const patients = createQuery({
  key: () => ['patients', clinicId()],
  fn: () => fetch(\`/api/clinics/\${clinicId()}/patients\`).then(r => r.json()),
});

// Changing clinicId triggers automatic re-fetch
clinicId.set(2);`;

export const MUTATION_CODE = `import { createMutation } from '@liteforge/query';

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

export const PROBLEM_CODE = `// ❌ Without @liteforge/query — manual state management
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

export const SOLUTION_CODE = `// ✅ With @liteforge/query — automatic caching & state
const patients = createQuery({
  key: 'patients',
  fn: () => fetch('/api/patients').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
});

// patients.data(), patients.isLoading(), patients.error()
// Cached — navigating away and back won't re-fetch until stale`;

export const LIVE_CODE = `const postId = signal(1);

const post = createQuery({
  key: () => ['post', postId()],
  fn: () => fetch(\`/api/posts/\${postId()}\`).then(r => r.json()),
  staleTime: 30_000,
});

<button onclick={() => postId.update(id => id + 1)}>Next →</button>
<Show when={() => post.isLoading()}>Loading…</Show>
<p>{() => post.data()?.title}</p>`;

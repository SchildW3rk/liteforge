// No imports — pure string constants

export const REACTIVE_EXPR_CODE = `// Any {() => expr} in JSX is a fine-grained reactive scope
// Only this text node re-renders when userName changes — nothing else

<p>Hello, {() => userName()}</p>

// Inline conditional — no component, just a reactive node
<div>{() => isAdmin() ? <AdminBadge /> : null}</div>

// Ternary with fallback
<div>{() => count() > 0 ? \`\${count()} items\` : 'No items'}</div>`;

export const REACTIVE_EXPR_SIGNAL_CODE = `import { signal, effect } from 'liteforge';

const count = signal(0);

// In JSX — each () => creates its own reactive scope
<button onclick={() => count.update(n => n + 1)}>
  Clicked {() => count()} times
</button>

// When count changes, ONLY the text node updates.
// The <button> element is never recreated.`;

export const SHOW_BASIC_CODE = `import { Show } from 'liteforge';
import { signal } from 'liteforge';

const isLoggedIn = signal(false);

// Basic — show or nothing
Show({
  when: () => isLoggedIn(),
  children: (loggedIn) => <Dashboard user={loggedIn} />,
})

// With fallback
Show({
  when: () => isLoggedIn(),
  children: (loggedIn) => <Dashboard user={loggedIn} />,
  fallback: () => <LoginForm />,
})`;

export const SHOW_REALISTIC_CODE = `import { Show } from 'liteforge';
import { createQuery } from '@liteforge/query';

const patientQuery = createQuery({
  key: 'patients',
  fn: () => fetch('/api/patients').then(r => r.json()),
});

// Loading state
Show({
  when: () => patientQuery.isLoading(),
  children: () => <Skeleton />,
})

// Error state
Show({
  when: () => patientQuery.error() !== undefined,
  children: () => <ErrorBanner message="Failed to load patients" />,
})

// Data — when() returns the Patient[], children receives it typed
Show({
  when: () => patientQuery.data(),
  children: (patients) => <PatientTable rows={patients} />,
})`;

export const SHOW_JSX_CODE = `// JSX tag syntax — same thing, different style
<Show when={() => isLoggedIn()} fallback={() => <LoginForm />}>
  {(user) => <Dashboard user={user} />}
</Show>`;

export const SWITCH_CODE = `import { Switch, Match } from 'liteforge';
import { signal } from 'liteforge';

type Status = 'idle' | 'loading' | 'success' | 'error';
const status = signal<Status>('idle');

Switch({
  fallback: () => <p>Unknown state</p>,
  children: [
    Match({ when: () => status() === 'loading', children: () => <Spinner /> }),
    Match({ when: () => status() === 'error',   children: () => <ErrorBanner /> }),
    Match({ when: () => status() === 'success', children: () => <AppointmentList /> }),
  ],
})`;

export const SWITCH_JSX_CODE = `// JSX syntax
<Switch fallback={() => <p>Unknown state</p>}>
  <Match when={() => status() === 'loading'}>{() => <Spinner />}</Match>
  <Match when={() => status() === 'error'}>{() => <ErrorBanner />}</Match>
  <Match when={() => status() === 'success'}>{() => <AppointmentList />}</Match>
</Switch>`;

export const FOR_BASIC_CODE = `import { For } from 'liteforge';
import { signal } from 'liteforge';

interface Patient {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

const patients = signal<Patient[]>([]);

// Pass the signal directly as each — For reads it reactively
For({
  each: patients,
  key: 'id',
  children: (patient, index) => (
    <li>
      {index + 1}. {patient.name} — {patient.status}
    </li>
  ),
})`;

export const FOR_JSX_CODE = `// JSX tag syntax
<For each={patients} key="id">
  {(patient, index) => (
    <li class="patient-item">
      <strong>{patient.name}</strong>
      <span class={patient.status === 'active' ? 'badge-green' : 'badge-gray'}>
        {patient.status}
      </span>
    </li>
  )}
</For>`;

export const FOR_WHY_NOT_MAP_CODE = `// ❌ Don't do this with signals — .map() runs once, never updates
<ul>
  {patients().map(p => <li>{p.name}</li>)}
</ul>

// ❌ This wraps the whole list in a getter — re-creates ALL nodes on every change
<ul>
  {() => patients().map(p => <li>{p.name}</li>)}
</ul>

// ✅ Use For — keyed reconciliation, only changed nodes update
<ul>
  <For each={patients} key="id">
    {(p) => <li>{p.name}</li>}
  </For>
</ul>`;

export const NESTED_CODE = `// Show inside For — conditional items in a list
<For each={appointments} key="id">
  {(appointment) => (
    <Show
      when={() => appointment.doctorId === selectedDoctor()}
      children={() => <AppointmentCard data={appointment} />}
    />
  )}
</For>

// For inside Show — don't render the list at all when loading
<Show when={() => !isLoading()} fallback={() => <Skeleton />}>
  {() => (
    <For each={patients} key="id">
      {(p) => <PatientRow patient={p} />}
    </For>
  )}
</Show>`;

export const QUERY_SHOW_CODE = `import { Show } from 'liteforge';
import { createQuery } from '@liteforge/query';

const appointments = createQuery({
  key: 'appointments',
  fn: () => fetch('/api/appointments').then(r => r.json()),
});

// Three-state UI with query — loading → error → data
Show({
  when: () => appointments.isLoading(),
  children: () => <LoadingSkeleton />,
  fallback: () => Show({
    when: () => appointments.error() !== undefined,
    children: () => <ErrorMessage error={appointments.error()} />,
    fallback: () => Show({
      when: () => appointments.data() !== undefined,
      children: (data) => <AppointmentGrid appointments={data} />,
    }),
  }),
})`;

export const LIVE_SHOW_CODE = `const isLoggedIn = signal(false);
const loading = signal(false);

Show({
  when: () => loading(),
  children: () => <span>Loading patient data…</span>,
  fallback: () => Show({
    when: () => isLoggedIn(),
    children: () => <span>✓ Welcome back, Dr. Fischer</span>,
    fallback: () => <span>Please log in to continue</span>,
  }),
})`;

export const LIVE_FOR_CODE = `const patients = signal([
  { id: 1, name: 'Anna Müller',    status: 'active' },
  { id: 2, name: 'Thomas Weber',   status: 'inactive' },
  { id: 3, name: 'Maria Fischer',  status: 'active' },
]);

For({
  each: patients,
  key: 'id',
  children: (p) => (
    <li>
      {p.name}
      <span class={p.status === 'active' ? 'green' : 'gray'}>
        {p.status}
      </span>
    </li>
  ),
})`;

export const LIVE_SWITCH_CODE = `type Status = 'idle' | 'loading' | 'success' | 'error';
const status = signal<Status>('idle');

Switch({
  fallback: () => <span>Click a status button above</span>,
  children: [
    Match({ when: () => status() === 'loading',
            children: () => <span>⟳ Fetching appointment data…</span> }),
    Match({ when: () => status() === 'error',
            children: () => <span>✕ Failed to load</span> }),
    Match({ when: () => status() === 'success',
            children: () => <span>✓ 12 appointments loaded</span> }),
  ],
})`;

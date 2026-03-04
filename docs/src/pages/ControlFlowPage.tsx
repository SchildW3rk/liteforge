import { createComponent, Show, For, Switch, Match } from 'liteforge';
import { Button } from '../components/Button.js';
import { createTable } from 'liteforge/table';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// =============================================================================
// Live Examples
// =============================================================================

function ShowLiveExample(): Node {
  const isLoggedIn = signal(false);
  const loading = signal(false);

  return (
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)] transition-colors"
          onclick={() => isLoggedIn.update(v => !v)}
        >
          {() => isLoggedIn() ? 'Log out' : 'Log in'}
        </button>
        <button
          class="px-3 py-1.5 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors"
          onclick={() => { loading.set(true); setTimeout(() => loading.set(false), 1500); }}
        >
          Simulate load
        </button>
      </div>

      <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm min-h-10">
        {Show({
          when: () => loading(),
          children: () => (
            <span class="text-yellow-300 font-mono text-xs">Loading patient data…</span>
          ),
          fallback: () => Show({
            when: () => isLoggedIn(),
            children: () => (
              <span class="text-emerald-300 font-mono text-xs">✓ Welcome back, Dr. Fischer</span>
            ),
            fallback: () => (
              <span class="text-[var(--content-muted)] font-mono text-xs">Please log in to continue</span>
            ),
          }),
        })}
      </div>
    </div>
  );
}

function ForLiveExample(): Node {
  interface Patient {
    id: number;
    name: string;
    status: 'active' | 'inactive';
  }

  let nextId = 4;
  const patients = signal<Patient[]>([
    { id: 1, name: 'Anna Müller', status: 'active' },
    { id: 2, name: 'Thomas Weber', status: 'inactive' },
    { id: 3, name: 'Maria Fischer', status: 'active' },
  ]);

  const names = ['Klaus Bauer', 'Petra Huber', 'Stefan Gruber', 'Lisa Krämer'];

  return (
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)] transition-colors"
          onclick={() => {
            const name = names[(nextId - 1) % names.length] ?? 'Patient';
            patients.update(ps => [...ps, { id: nextId++, name, status: 'active' }]);
          }}
        >
          Add patient
        </button>
        <button
          class="px-3 py-1.5 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors"
          onclick={() => patients.update(ps => ps.slice(0, -1))}
        >
          Remove last
        </button>
      </div>

      <ul class="space-y-1.5">
        {For({
          each: patients,
          key: (patient) => patient.id,
          children: (p) => (
            <li class="flex items-center justify-between px-3 py-2 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm">
              <span class="text-[var(--content-secondary)]">{p.name}</span>
              <span class={p.status === 'active'
                ? 'text-xs px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300'
                : 'text-xs px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--content-muted)]'
              }>
                {p.status}
              </span>
            </li>
          ),
          fallback: () => (
            <li class="px-3 py-2 text-[var(--content-muted)] text-sm font-mono">No patients</li>
          ),
        })}
      </ul>
    </div>
  );
}

function SwitchLiveExample(): Node {
  type Status = 'idle' | 'loading' | 'success' | 'error';
  const status = signal<Status>('idle');

  return (
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onclick={() => status.set('idle')}>idle</Button>
        <Button variant="secondary" size="sm" onclick={() => status.set('loading')}>loading</Button>
        <Button variant="secondary" size="sm" onclick={() => status.set('success')}>success</Button>
        <Button variant="secondary" size="sm" onclick={() => status.set('error')}>error</Button>
      </div>

      <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm min-h-12">
        {Switch({
          fallback: () => (
            <span class="text-[var(--content-muted)] font-mono text-xs">Click a status button above</span>
          ),
          children: [
            Match({
              when: () => status() === 'loading',
              children: () => <span class="text-yellow-300 font-mono text-xs">⟳ Fetching appointment data…</span>,
            }),
            Match({
              when: () => status() === 'error',
              children: () => <span class="text-red-300 font-mono text-xs">✕ Failed to load — check your connection</span>,
            }),
            Match({
              when: () => status() === 'success',
              children: () => <span class="text-emerald-300 font-mono text-xs">✓ 12 appointments loaded</span>,
            }),
          ],
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Code strings
// =============================================================================

const REACTIVE_EXPR_CODE = `// Any {() => expr} in JSX is a fine-grained reactive scope
// Only this text node re-renders when userName changes — nothing else

<p>Hello, {() => userName()}</p>

// Inline conditional — no component, just a reactive node
<div>{() => isAdmin() ? <AdminBadge /> : null}</div>

// Ternary with fallback
<div>{() => count() > 0 ? \`\${count()} items\` : 'No items'}</div>`;

const REACTIVE_EXPR_SIGNAL_CODE = `import { signal, effect } from 'liteforge';

const count = signal(0);

// In JSX — each () => creates its own reactive scope
<button onclick={() => count.update(n => n + 1)}>
  Clicked {() => count()} times
</button>

// When count changes, ONLY the text node updates.
// The <button> element is never recreated.`;

const SHOW_BASIC_CODE = `import { Show } from 'liteforge';
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

const SHOW_REALISTIC_CODE = `import { Show } from 'liteforge';
import { createQuery } from 'liteforge/query';

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

const SHOW_JSX_CODE = `// JSX tag syntax — same thing, different style
<Show when={() => isLoggedIn()} fallback={() => <LoginForm />}>
  {(user) => <Dashboard user={user} />}
</Show>`;

const SWITCH_CODE = `import { Switch, Match } from 'liteforge';
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

const SWITCH_JSX_CODE = `// JSX syntax
<Switch fallback={() => <p>Unknown state</p>}>
  <Match when={() => status() === 'loading'}>{() => <Spinner />}</Match>
  <Match when={() => status() === 'error'}>{() => <ErrorBanner />}</Match>
  <Match when={() => status() === 'success'}>{() => <AppointmentList />}</Match>
</Switch>`;

const FOR_BASIC_CODE = `import { For } from 'liteforge';
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

const FOR_JSX_CODE = `// JSX tag syntax
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

const FOR_WHY_NOT_MAP_CODE = `// ❌ Don't do this with signals — .map() runs once, never updates
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

const NESTED_CODE = `// Show inside For — conditional items in a list
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

const QUERY_SHOW_CODE = `import { Show } from 'liteforge';
import { createQuery } from 'liteforge/query';

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

const LIVE_SHOW_CODE = `const isLoggedIn = signal(false);
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

const LIVE_FOR_CODE = `const patients = signal([
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

const LIVE_SWITCH_CODE = `type Status = 'idle' | 'loading' | 'success' | 'error';
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

// =============================================================================
// API rows
// =============================================================================

const SHOW_API: ApiRow[] = [
  { name: 'when', type: '() => T | T', description: 'Condition — when truthy, children is called with the value (narrowed to NonNullable<T>)' },
  { name: 'children', type: '(value: NonNullable<T>) => Node', description: 'Render function called with the truthy value' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when when is falsy' },
];

const FOR_API: ApiRow[] = [
  { name: 'each', type: 'Signal<T[]> | T[]', description: 'Array source — pass the signal directly or a plain array' },
  { name: 'key', type: 'keyof T | (item: T, index: number) => string | number', default: 'index', description: 'Key for reconciliation — string property name (e.g. \'id\') or key extractor function' },
  { name: 'children', type: '(item: T, index: number) => Node', description: 'Render function called for each item' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when the array is empty' },
];

const SWITCH_API: ApiRow[] = [
  { name: 'children', type: 'MatchCase[]', description: 'Array of Match case objects — first truthy match wins' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when no Match condition is true' },
];

const MATCH_API: ApiRow[] = [
  { name: 'when', type: '() => boolean | boolean', description: 'Condition — first true match in a Switch wins' },
  { name: 'children', type: '() => Node', description: 'Render function for this case' },
];

// =============================================================================
// Decision guide data
// =============================================================================

interface DecisionRow {
  situation: string;
  use: string;
}

const DECISION_ROWS: DecisionRow[] = [
  { situation: 'Simple true/false, no fallback',   use: '{() => cond() ? <A /> : null}' },
  { situation: 'True/false with fallback UI',       use: 'Show' },
  { situation: 'Multiple exclusive conditions (3+)', use: 'Switch / Match' },
  { situation: 'Rendering an array',                use: 'For' },
  { situation: 'Dynamic text / interpolation',      use: '{() => signal()}' },
  { situation: 'Typed value in condition body',     use: 'Show (narrows NonNullable<T>)' },
];

// =============================================================================
// Page
// =============================================================================

export const ControlFlowPage = createComponent({
  name: 'ControlFlowPage',
  component() {
    const decisionTable = createTable<DecisionRow>({
      data: () => DECISION_ROWS,
      columns: [
        {
          key: 'situation',
          header: 'Situation',
          sortable: false,
          cell: (v) => <span class="text-[var(--content-secondary)]">{String(v)}</span>,
        },
        {
          key: 'use',
          header: 'Use',
          sortable: false,
          cell: (v) => <span class="font-mono text-indigo-300 text-xs">{String(v)}</span>,
        },
      ],
      unstyled: true,
      classes: {
        root:       'overflow-x-auto rounded-lg border border-[var(--line-default)] my-4',
        table:      'w-full text-sm text-left',
        header:     'bg-[var(--surface-raised)] text-[var(--content-secondary)] text-xs uppercase tracking-wider',
        headerCell: 'px-4 py-3',
        body:       '',
        row:        '',
        cell:       'px-4 py-3',
      },
    });

    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Control Flow</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Conditionals, lists, and reactive rendering — no virtual DOM diffing, just surgical DOM updates.
            Each reactive node updates independently when its signal changes.
          </p>
          <CodeBlock
            code={`import { Show, Switch, Match, For } from 'liteforge';`}
            language="typescript"
          />
        </div>

        {/* Section 1: Reactive expressions */}
        <DocSection
          title="Reactive expressions {() => ...}"
          id="reactive-expressions"
          description="The foundation of everything. Any () => expr in JSX creates a fine-grained reactive scope — only that DOM node updates when the signal changes, nothing else."
        >
          <div>
            <CodeBlock code={REACTIVE_EXPR_SIGNAL_CODE} language="tsx" />
            <CodeBlock code={REACTIVE_EXPR_CODE} language="tsx" />
            <div class="mt-4 p-4 rounded-lg border border-indigo-500/20 bg-indigo-950/20 text-sm text-[var(--content-secondary)] leading-relaxed">
              <span class="font-semibold text-indigo-300">When to use inline expressions: </span>
              Simple signal reads, text interpolation, and short ternaries. For complex conditions or fallbacks, use
              <code class="mx-1 px-1 py-0.5 rounded bg-[var(--surface-overlay)] text-xs font-mono text-indigo-300">Show</code>.
            </div>
          </div>
        </DocSection>

        {/* Section 2: Show */}
        <DocSection
          title="Show"
          id="show"
          description="Conditional rendering with typed value passing. When the condition is truthy, children receives the value narrowed to NonNullable<T> — no optional chaining needed."
        >
          <div>
            <CodeBlock code={SHOW_BASIC_CODE} language="tsx" />
            <CodeBlock code={SHOW_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={SHOW_API} />
            <CodeBlock code={SHOW_REALISTIC_CODE} language="tsx" title="With @liteforge/query" />
            <LiveExample
              title="Show — conditional login state"
              component={ShowLiveExample}
              code={LIVE_SHOW_CODE}
            />
          </div>
        </DocSection>

        {/* Section 3: Switch / Match */}
        <DocSection
          title="Switch / Match"
          id="switch"
          description="Multiple exclusive conditions — like a switch/case for JSX. First truthy Match wins. Cleaner than nested ternaries when you have 3+ states."
        >
          <div>
            <CodeBlock code={SWITCH_CODE} language="tsx" />
            <CodeBlock code={SWITCH_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <p class="text-xs font-semibold text-[var(--content-secondary)] mb-1 mt-4">Switch</p>
            <ApiTable rows={SWITCH_API} />
            <p class="text-xs font-semibold text-[var(--content-secondary)] mb-1 mt-4">Match</p>
            <ApiTable rows={MATCH_API} />
            <LiveExample
              title="Switch — appointment status"
              component={SwitchLiveExample}
              code={LIVE_SWITCH_CODE}
            />
          </div>
        </DocSection>

        {/* Section 4: For */}
        <DocSection
          title="For"
          id="for"
          description="Keyed list rendering. For each item LiteForge tracks a stable key — when the array changes, only the nodes that actually changed are updated or moved. No full re-render."
        >
          <div>
            <CodeBlock code={FOR_BASIC_CODE} language="tsx" />
            <CodeBlock code={FOR_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={FOR_API} />
            <CodeBlock code={FOR_WHY_NOT_MAP_CODE} language="tsx" title="Why not .map()?" />
            <LiveExample
              title="For — patient list with add/remove"
              component={ForLiveExample}
              code={LIVE_FOR_CODE}
            />
          </div>
        </DocSection>

        {/* Section 5: Decision guide */}
        <DocSection title="When to use what" id="decision-guide">
          {decisionTable.Root()}
        </DocSection>

        {/* Section 6: Patterns & tips */}
        <DocSection
          title="Patterns & tips"
          id="patterns"
        >
          <div>
            <p class="text-sm text-[var(--content-secondary)] mb-3">Composing control flow primitives for real-world UIs:</p>
            <CodeBlock code={NESTED_CODE} language="tsx" title="Nesting Show inside For (and vice versa)" />
            <CodeBlock code={QUERY_SHOW_CODE} language="tsx" title="Show + @liteforge/query — three-state loading UI" />
          </div>
        </DocSection>
      </div>
    );
  },
});

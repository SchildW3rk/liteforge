import { createComponent } from '@liteforge/runtime';
import { signal } from '@liteforge/core';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import { inputClass } from '../components/Input.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live examples ────────────────────────────────────────────────────────────

function ToggleExample(): Node {
  const open = signal(false);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const btn = document.createElement('button');
  btn.className = btnClass('primary', 'sm');
  effect(() => { btn.textContent = open() ? 'Hide details' : 'Show details'; });
  btn.addEventListener('click', () => open.update(v => !v));

  const panel = document.createElement('div');
  panel.className = 'p-3 rounded border border-indigo-500/30 bg-indigo-950/20 text-sm text-indigo-200';
  panel.textContent = 'Hidden content revealed by Show({ when: open })';
  effect(() => { panel.style.display = open() ? '' : 'none'; });

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  return wrap;
}

function ForExample(): Node {
  const items = signal(['Appointments', 'Patients', 'Invoices']);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-2';

  const input = document.createElement('input');
  input.className = inputClass({ extra: 'mb-2' });
  input.placeholder = 'Add item...';
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && input.value.trim() !== '') {
      items.update(list => [...list, input.value.trim()]);
      input.value = '';
    }
  });

  const list = document.createElement('ul');
  list.className = 'space-y-1';

  effect(() => {
    list.innerHTML = '';
    for (const item of items()) {
      const li = document.createElement('li');
      li.className = 'text-sm text-[var(--content-secondary)] px-2 py-1 rounded bg-[var(--surface-overlay)]/50';
      li.textContent = item;
      list.appendChild(li);
    }
  });

  wrap.appendChild(input);
  wrap.appendChild(list);
  return wrap;
}

// ─── Code strings ─────────────────────────────────────────────────────────────

// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';
const COMPONENT_CODE = `import { ${_cc} } from '@liteforge/runtime';
import { signal } from '@liteforge/core';

export const PatientCard = ${_cc}({
  name: 'PatientCard',
  component({ props }) {
    const expanded = signal(false);

    return (
      <div class="card">
        <h2>{props.name}</h2>
        <button onclick={() => expanded.update(v => !v)}>
          {() => expanded() ? 'Collapse' : 'Expand'}
        </button>
        {() => expanded()
          ? <p>{props.notes}</p>
          : null}
      </div>
    );
  },
});`;

const JSX_CODE = `// Static attribute
<div class="my-class" />

// Dynamic attribute (needs getter wrapper)
<div class={() => isActive() ? 'active' : 'inactive'} />

// Reactive text
<span>{() => count()}</span>

// Event handler (no wrapper needed)
<button onclick={() => doSomething()}>Click</button>

// Conditional rendering
<Show when={isLoggedIn}>
  <Dashboard />
</Show>

// List rendering
<For each={patients}>
  {(patient) => <PatientRow patient={patient} />}
</For>`;

const SHOW_CODE = `import { Show } from '@liteforge/runtime';

const isAdmin = signal(false);

// Renders children only when when() is truthy
Show({
  when: () => isAdmin(),
  children: () => <AdminPanel />,
  fallback: () => <p>Access denied</p>,
})`;

const FOR_CODE = `import { For } from '@liteforge/runtime';

const appointments = signal([
  { id: 1, patient: 'Anna Müller', time: '09:00' },
  { id: 2, patient: 'Tom Weber',   time: '10:30' },
]);

For({
  each: () => appointments(),
  children: (appt) => (
    <div class="row">
      <span>{appt.time}</span>
      <span>{appt.patient}</span>
    </div>
  ),
})`;

const USE_CODE = `// Each plugin augments PluginRegistry via Declaration Merging —
// use() return type is inferred automatically, no manual type param needed.

const MyPage = ${_cc}({
  name: 'MyPage',
  component({ use }) {
    const router = use('router');  // typed as Router  — via @liteforge/router
    const modal  = use('modal');   // typed as ModalApi — via @liteforge/modal

    const patientId = computed(() => router.currentRoute()?.params['id'] ?? '');
    const openHelp  = () => modal.open(HelpDialog);

    return (
      <div>
        <span>{() => patientId()}</span>
        <button onclick={openHelp}>Help</button>
      </div>
    );
  },
});

// Register plugins once in main.ts:
await createApp({ root: App, target: '#app' })
  .use(routerPlugin({ routes }))
  .use(modalPlugin())
  .mount();`;

const LIFECYCLE_CODE = `${_cc}({
  name: 'DataTable',
  async load({ props }) {
    const data = await fetchPatients(props.clinicId);
    return { data };
  },
  placeholder: () => <Skeleton />,
  error: ({ error, retry }) => (
    <div>
      <p>Failed: {error.message}</p>
      <button onclick={retry}>Retry</button>
    </div>
  ),
  component({ data, setup }) {
    return <table>{data.patients.map(p => <Row patient={p} />)}</table>;
  },
  mounted({ el }) {
    el.classList.add('fade-in');
  },
  destroyed() {
    cleanup();
  },
});`;

const TOGGLE_CODE = `const open = signal(false);

<button onclick={() => open.update(v => !v)}>
  {() => open() ? 'Hide' : 'Show'}
</button>
<Show when={() => open()}>
  <p>Hidden content</p>
</Show>`;

const FOR_LIVE_CODE = `const items = signal(['Appointments', 'Patients', 'Invoices']);

<input
  placeholder="Add item..."
  onkeydown={e => {
    if (e.key === 'Enter') {
      items.update(list => [...list, e.target.value]);
    }
  }}
/>
<For each={() => items()}>
  {(item) => <li>{item}</li>}
</For>`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const COMPONENT_API: ApiRow[] = [
  { name: 'name', type: 'string', description: 'Component identifier used in DevTools and HMR' },
  { name: 'component(args)', type: 'Node', description: 'Render function — receives props, data, setup. Returns a DOM node (JSX)' },
  { name: 'setup(args)', type: 'object', description: 'Runs before load() — set up signals and handlers that don\'t need async data' },
  { name: 'load(args)', type: 'Promise<object>', description: 'Async data loading — return value is passed as data to component()' },
  { name: 'placeholder()', type: 'Node', description: 'Rendered while load() is in flight' },
  { name: 'error(args)', type: 'Node', description: 'Rendered when load() throws — receives error and retry()' },
  { name: 'mounted({ el })', type: 'void', description: 'Called after component is mounted to the DOM' },
  { name: 'destroyed()', type: 'void', description: 'Called when component is removed from the DOM' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

import { effect } from '@liteforge/core';

export const RuntimePage = createComponent({
  name: 'RuntimePage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Components & JSX</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            The component model and DOM runtime. Create components with{' '}
            <code class="font-mono text-sm text-indigo-300">createComponent()</code>,
            {' '}use JSX for declarative UI, and control rendering with{' '}
            <code class="font-mono text-sm text-indigo-300">Show</code>,{' '}
            <code class="font-mono text-sm text-indigo-300">For</code>, and{' '}
            <code class="font-mono text-sm text-indigo-300">Switch</code>.
          </p>
          <CodeBlock code={`pnpm add @liteforge/runtime @liteforge/core`} language="bash" />
          <CodeBlock code={`import { createComponent, Show, For } from '@liteforge/runtime';`} language="typescript" />
        </div>

        <DocSection
          title="createComponent()"
          id="create-component"
          description="Defines a component — a factory function that creates a DOM node with reactive bindings."
        >
          <div>
            <CodeBlock code={COMPONENT_CODE} language="tsx" />
            <ApiTable rows={COMPONENT_API} />
          </div>
        </DocSection>

        <DocSection
          title="JSX syntax"
          id="jsx"
          description="LiteForge JSX compiles to direct DOM operations — no virtual DOM. Key rule: reactive expressions need () => wrappers, event handlers do not."
        >
          <CodeBlock code={JSX_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title="Show — conditional rendering"
          id="show"
          description="Renders children when the when condition is truthy. Unmounts when falsy."
        >
          <div>
            <CodeBlock code={SHOW_CODE} language="tsx" />
            <LiveExample
              title="Show"
              description="Toggle visibility"
              component={ToggleExample}
              code={TOGGLE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title="For — list rendering"
          id="for"
          description="Renders a list of items reactively. Re-renders the minimal set of items when the array changes."
        >
          <div>
            <CodeBlock code={FOR_CODE} language="tsx" />
            <LiveExample
              title="For"
              description="Press Enter to add items"
              component={ForExample}
              code={FOR_LIVE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title="Plugin injection (use)"
          id="use"
          description="Access plugins registered with .use() via the use() function passed to component(). Fully typed via Declaration Merging."
        >
          <CodeBlock code={USE_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title="Async lifecycle (load)"
          id="lifecycle"
          description="Use load() for async data fetching. While loading, placeholder() renders. On error, error() renders with a retry() function."
        >
          <CodeBlock code={LIFECYCLE_CODE} language="tsx" />
        </DocSection>
      </div>
    );
  },
});

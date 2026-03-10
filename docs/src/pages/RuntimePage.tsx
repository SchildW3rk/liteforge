import { createComponent, signal, effect, use } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import { inputClass } from '../components/Input.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

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
const COMPONENT_CODE = `import { ${_cc} } from 'liteforge';
import { signal } from 'liteforge';

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

const SHOW_CODE = `import { Show } from 'liteforge';

const isAdmin = signal(false);

// Renders children only when when() is truthy
Show({
  when: () => isAdmin(),
  children: () => <AdminPanel />,
  fallback: () => <p>Access denied</p>,
})`;

const FOR_CODE = `import { For } from 'liteforge';

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export const RuntimePage = createComponent({
  name: 'RuntimePage',
  component() {
    const { t } = use('i18n');

    const getComponentApi = (): ApiRow[] => [
      { name: 'name', type: 'string', description: t('runtime.apiName') },
      { name: 'component(args)', type: 'Node', description: t('runtime.apiComponent') },
      { name: 'setup(args)', type: 'object', description: t('runtime.apiSetup') },
      { name: 'load(args)', type: 'Promise<object>', description: t('runtime.apiLoad') },
      { name: 'placeholder()', type: 'Node', description: t('runtime.apiPlaceholder') },
      { name: 'error(args)', type: 'Node', description: t('runtime.apiError') },
      { name: 'mounted({ el })', type: 'void', description: t('runtime.apiMounted') },
      { name: 'destroyed()', type: 'void', description: t('runtime.apiDestroyed') },
    ];

    setToc([
      { id: 'create-component', label: () => t('runtime.createComponent'), level: 2 },
      { id: 'jsx',              label: () => t('runtime.jsx'),              level: 2 },
      { id: 'show',             label: () => t('runtime.show'),             level: 2 },
      { id: 'for',              label: () => t('runtime.for'),              level: 2 },
      { id: 'use',              label: () => t('runtime.use'),              level: 2 },
      { id: 'lifecycle',        label: () => t('runtime.lifecycle'),        level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('runtime.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('runtime.subtitlePre')}{' '}
            <code class="font-mono text-sm text-indigo-300">createComponent()</code>,
            {' '}{() => t('runtime.subtitleMid')}{' '}
            <code class="font-mono text-sm text-indigo-300">Show</code>,{' '}
            <code class="font-mono text-sm text-indigo-300">For</code>, {() => t('runtime.subtitleAnd')}{' '}
            <code class="font-mono text-sm text-indigo-300">Switch</code>.
          </p>
          <CodeBlock code={`pnpm add @liteforge/runtime @liteforge/core`} language="bash" />
          <CodeBlock code={`import { createComponent, Show, For } from 'liteforge';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('runtime.createComponent')}
          id="create-component"
          description={() => t('runtime.createComponentDesc')}
        >
          <div>
            <CodeBlock code={COMPONENT_CODE} language="tsx" />
            <ApiTable rows={() => getComponentApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.jsx')}
          id="jsx"
          description={() => t('runtime.jsxDesc')}
        >
          <CodeBlock code={JSX_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('runtime.show')}
          id="show"
          description={() => t('runtime.showDesc')}
        >
          <div>
            <CodeBlock code={SHOW_CODE} language="tsx" />
            <LiveExample
              title={() => t('runtime.showTitle')}
              description={() => t('runtime.showDescEx')}
              component={ToggleExample}
              code={TOGGLE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.for')}
          id="for"
          description={() => t('runtime.forDesc')}
        >
          <div>
            <CodeBlock code={FOR_CODE} language="tsx" />
            <LiveExample
              title={() => t('runtime.forTitle')}
              description={() => t('runtime.forDescEx')}
              component={ForExample}
              code={FOR_LIVE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.use')}
          id="use"
          description={() => t('runtime.useDesc')}
        >
          <CodeBlock code={USE_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('runtime.lifecycle')}
          id="lifecycle"
          description={() => t('runtime.lifecycleDesc')}
        >
          <CodeBlock code={LIFECYCLE_CODE} language="tsx" />
        </DocSection>
      </div>
    );
  },
});

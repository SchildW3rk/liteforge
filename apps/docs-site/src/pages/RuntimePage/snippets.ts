// No imports — pure string constants

// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

export const COMPONENT_CODE = `import { ${_cc} } from 'liteforge';
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

export const JSX_CODE = `// Static attribute
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

export const SHOW_CODE = `import { Show } from 'liteforge';

const isAdmin = signal(false);

// Renders children only when when() is truthy
Show({
  when: () => isAdmin(),
  children: () => <AdminPanel />,
  fallback: () => <p>Access denied</p>,
})`;

export const FOR_CODE = `import { For } from 'liteforge';

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

export const USE_CODE = `// Each plugin augments PluginRegistry via Declaration Merging —
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

export const LIFECYCLE_CODE = `${_cc}({
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

export const TOGGLE_CODE = `const open = signal(false);

<button onclick={() => open.update(v => !v)}>
  {() => open() ? 'Hide' : 'Show'}
</button>
<Show when={() => open()}>
  <p>Hidden content</p>
</Show>`;

export const USE_CLICK_OUTSIDE_CODE = `import { useClickOutside } from '@liteforge/runtime';
import { signal } from 'liteforge';

const open = signal(false);
let containerEl: HTMLElement | null = null;

// Auto-cleanup when called inside setup() or an effect.
// Returns a manual cleanup function when used outside a reactive context.
useClickOutside(() => containerEl, () => open.set(false));

return (
  <div ref={(el) => { containerEl = el; }}>
    <button onclick={() => open.set(true)}>Open dropdown</button>
    <Show when={() => open()}>
      {() => (
        <ul class="dropdown">
          <li>Option A</li>
          <li>Option B</li>
        </ul>
      )}
    </Show>
  </div>
);

// Multiple elements — trigger and floating panel are separate nodes
useClickOutside(() => [triggerEl, panelEl], () => open.set(false));`;

export const FOR_LIVE_CODE = `const items = signal(['Appointments', 'Patients', 'Invoices']);

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

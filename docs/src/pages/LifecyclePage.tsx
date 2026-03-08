import { createComponent, signal, effect } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example: lifecycle log ───────────────────────────────────────────────

function LifecycleExample(): Node {
  const log = signal<string[]>([]);
  const mounted = signal(true);

  const addLog = (msg: string) => {
    log.update(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0, 8));
  };

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  // Log display
  const logEl = document.createElement('div');
  logEl.className = 'font-mono text-xs space-y-1 min-h-[100px]';
  effect(() => {
    logEl.innerHTML = '';
    for (const entry of log()) {
      const row = document.createElement('div');
      row.className = 'text-emerald-400';
      row.textContent = entry;
      logEl.appendChild(row);
    }
    if (log().length === 0) {
      logEl.textContent = 'Mount the child component to see lifecycle events…';
      logEl.className = 'font-mono text-xs text-[var(--content-muted)] min-h-[100px]';
    }
  });

  // Child component (simulated with plain DOM)
  let child: HTMLElement | null = null;
  let childEffect: (() => void) | null = null;

  const makeChild = () => {
    const el = document.createElement('div');
    el.className = 'px-3 py-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-sm text-indigo-200';
    const count = signal(0);

    // onMount equivalent
    addLog('mounted() — component attached to DOM');

    // effect with onCleanup equivalent
    childEffect = effect(() => {
      el.textContent = `Count: ${count()} (click to increment)`;
      // cleanup runs before each re-run and on unmount
      return () => addLog(`onCleanup() — effect re-ran (count changed to ${count()})`);
    });

    el.addEventListener('click', () => {
      count.update(n => n + 1);
    });

    // Store count for unmount demonstration
    (el as HTMLElement & { _count?: typeof count })._count = count;
    return { el, count };
  };

  const mountBtn = document.createElement('button');
  const unmountBtn = document.createElement('button');

  const updateStyle = () => {
    mountBtn.className = `px-3 py-1.5 text-sm rounded font-medium transition-opacity ${mounted() ? 'opacity-40 cursor-not-allowed bg-[var(--surface-overlay)] text-[var(--content-muted)]' : 'bg-indigo-600 text-white hover:opacity-80'}`;
    unmountBtn.className = `px-3 py-1.5 text-sm rounded font-medium transition-opacity ${mounted() ? 'bg-red-700/80 text-white hover:opacity-80' : 'opacity-40 cursor-not-allowed bg-[var(--surface-overlay)] text-[var(--content-muted)]'}`;
  };

  mountBtn.textContent = 'Mount child';
  mountBtn.addEventListener('click', () => {
    if (mounted()) return;
    const { el } = makeChild();
    child = el;
    childContainer.appendChild(el);
    mounted.set(true);
    updateStyle();
  });

  unmountBtn.textContent = 'Unmount child';
  unmountBtn.addEventListener('click', () => {
    if (!mounted()) return;
    if (childEffect) { childEffect(); childEffect = null; }
    child?.remove();
    child = null;
    mounted.set(false);
    addLog('destroyed() — component removed from DOM');
    updateStyle();
  });

  const childContainer = document.createElement('div');
  childContainer.className = 'min-h-[44px]';

  // Auto-mount on first render
  const { el: initialChild } = makeChild();
  child = initialChild;
  childContainer.appendChild(initialChild);
  updateStyle();

  const btnRow = document.createElement('div');
  btnRow.className = 'flex gap-2';
  btnRow.appendChild(mountBtn);
  btnRow.appendChild(unmountBtn);

  const logBox = document.createElement('div');
  logBox.className = 'p-3 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] min-h-[120px]';
  logBox.appendChild(logEl);

  wrap.appendChild(childContainer);
  wrap.appendChild(btnRow);
  wrap.appendChild(logBox);
  return wrap;
}

// ─── Diagram ───────────────────────────────────────────────────────────────────

function LifecycleDiagram(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'overflow-x-auto';
  wrap.innerHTML = `
<pre class="text-xs font-mono text-[var(--content-secondary)] leading-relaxed p-4 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] select-all">
createComponent()
      │
      ▼
  setup()           ← runs once, returns reactive state
      │
      ▼
  load()            ← optional async (shows placeholder while loading)
      │
      ▼
  component()       ← builds + returns DOM (JSX)
      │
      ▼
  mounted()         ← DOM attached, do imperative work (focus, animate, 3rd-party)
      │
      ┌──────────────────────────────────────┐
      │   Reactive update loop               │
      │                                      │
      │  signal.set()                        │
      │      │                               │
      │      ▼                               │
      │  effect re-runs                      │
      │      │                               │
      │      ▼                               │
      │  onCleanup() ← per-effect cleanup    │
      │      │         (runs before re-run   │
      │      │          and on unmount)       │
      └──────────────────────────────────────┘
      │
      ▼
  destroyed()       ← component removed from DOM
</pre>`;
  return wrap;
}

// ─── Code strings ──────────────────────────────────────────────────────────────

const _cc = 'createComponent';
const FULL_CODE = `import { ${_cc}, onCleanup, onMount, onUnmount } from 'liteforge';

export const MyWidget = ${_cc}({
  name: 'MyWidget',

  // 1. setup() — runs once, before any DOM is built
  //    Return signals, queries, tables, etc.
  setup({ props }) {
    const count = signal(0);
    const doubled = computed(() => count() * 2);
    return { count, doubled };
  },

  // 2. load() — optional async data fetch
  //    Component stays on placeholder until this resolves
  async load({ props }) {
    const data = await fetch(\`/api/items/\${props.id}\`).then(r => r.json());
    return { data };
  },

  placeholder: () => <div class="skeleton" />,

  // 3. component() — build and return DOM / JSX
  component({ setup, data }) {
    const { count } = setup;

    // onCleanup runs before each effect re-run AND when component is destroyed
    effect(() => {
      const handler = () => count.update(n => n + 1);
      window.addEventListener('keydown', handler);
      onCleanup(() => window.removeEventListener('keydown', handler));
    });

    return <button onclick={() => count.update(n => n + 1)}>{() => count()}</button>;
  },

  // 4. mounted() — DOM is attached, el is the root element
  mounted({ el }) {
    el.classList.add('fade-in');
    el.querySelector('button')?.focus();
  },

  // 5. destroyed() — component removed from DOM
  destroyed() {
    console.log('cleaned up');
  },
});`;

const ONCLEANUP_CODE = `import { effect, onCleanup } from 'liteforge';

// onCleanup() registers a function that runs:
//   1. Before each effect re-run (if signal deps changed)
//   2. When the component is destroyed

effect(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));  // always cleaned up
});

// Also useful outside effects — called on component destroy:
component() {
  const socket = new WebSocket('/ws');
  onCleanup(() => socket.close());
  return <div />;
}`;

const TOOLTIP_CLEANUP_CODE = `// Real-world pattern: tooltip ref-callback + onCleanup
import { tooltip } from 'liteforge/tooltip';

component({ props }) {
  const el = document.createElement('button');
  el.textContent = props.label;

  // tooltip() returns a cleanup function
  const cleanupTooltip = tooltip(el, {
    content:  props.hint,
    position: 'right',
    delay:    150,
  });

  // Cleanup is called automatically when the component unmounts
  onCleanup(cleanupTooltip);

  return el;
}`;

const MOUNT_UNMOUNT_CODE = `// onMount() and onUnmount() — convenience wrappers
// Equivalent to mounted() / destroyed() lifecycle hooks
// but callable from inside component() or nested functions.

import { onMount, onUnmount } from 'liteforge';

component() {
  const chart = createChart();

  onMount(() => {
    chart.resize();        // safe to access DOM here
    chart.startAnimation();
  });

  onUnmount(() => {
    chart.destroy();       // release resources
  });

  return <div ref={el => chart.attach(el)} />;
}`;

const DIFF_CODE = `// onCleanup  — effect-scoped, runs on every re-run + unmount
// onUnmount  — component-scoped, runs only once on unmount

effect(() => {
  const sub = store.subscribe(handler);
  onCleanup(() => sub.unsubscribe());  // ← re-run safe
});

onUnmount(() => {
  analytics.trackPageLeave();          // ← once only
});`;

// ─── API rows ──────────────────────────────────────────────────────────────────

const HOOKS_API: ApiRow[] = [
  { name: 'setup({ props, use })', type: 'object', description: "Runs once before the DOM is built. Return signals, queries, and derived state. Receives component props and the use() injection function." },
  { name: 'load({ props, setup, use })', type: 'Promise<object>', description: "Optional async data fetch. Component shows placeholder until resolved. Return value merges into data object passed to component()." },
  { name: 'placeholder()', type: 'Node', description: "Rendered while load() is pending. Replaced by component() output once load resolves." },
  { name: 'error({ error, retry })', type: 'Node', description: "Rendered if load() rejects. retry() re-runs load()." },
  { name: 'component({ props, setup, data })', type: 'Node', description: "Main render function. Called once — reactivity is driven by effects and signals, not re-renders." },
  { name: 'mounted({ el })', type: 'void', description: "Called after component() output is attached to the live DOM. el is the root element. Safe to measure, focus, animate." },
  { name: 'destroyed()', type: 'void', description: "Called when the component is removed from the DOM." },
];

const UTILS_API: ApiRow[] = [
  { name: 'onCleanup(fn)', type: 'void', description: "Register a cleanup function inside an effect. Runs before each re-run and on component destroy. Must be called synchronously inside an effect or lifecycle hook." },
  { name: 'onMount(fn)', type: 'void', description: "Register a function to run after the component is attached to the DOM. Equivalent to the mounted() hook, but callable from component()." },
  { name: 'onUnmount(fn)', type: 'void', description: "Register a function to run when the component is removed. Equivalent to destroyed(), but callable from component()." },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const LifecyclePage = createComponent({
  name: 'LifecyclePage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Component Lifecycle</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            LiteForge components do not re-render. The component function runs{' '}
            <em>once</em> and returns a DOM tree. Reactivity happens through signals
            and effects — not reconciliation. This page explains every lifecycle hook
            and when to use each one.
          </p>
        </div>

        <DocSection title="Lifecycle diagram" id="diagram">
          {LifecycleDiagram()}
        </DocSection>

        <DocSection title="Full example" id="full" description="All lifecycle hooks in one component.">
          <CodeBlock code={FULL_CODE} language="typescript" />
        </DocSection>

        <DocSection title="Interactive demo" id="demo" description="Mount and unmount a child component to see lifecycle events fire in real time.">
          <LiveExample
            title="Lifecycle events"
            code={`mounted()  → attached\nonCleanup() → effect re-ran\ndestroyed() → removed`}
            component={LifecycleExample}
          />
        </DocSection>

        <DocSection title="onCleanup()" id="oncleanup"
          description="The most important lifecycle primitive — register cleanup for effects. Runs before every re-run of the enclosing effect AND when the component is destroyed. Zero risk of memory leaks or stale listeners.">
          <CodeBlock code={ONCLEANUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title="Real pattern: tooltip + onCleanup" id="tooltip-cleanup"
          description="tooltip() returns a cleanup function — pair it with onCleanup() for leak-free usage inside createComponent.">
          <CodeBlock code={TOOLTIP_CLEANUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title="onMount() / onUnmount()" id="mount-unmount"
          description="Convenience wrappers callable from inside component() — useful when you can't or don't want to use the mounted/destroyed hooks directly.">
          <CodeBlock code={MOUNT_UNMOUNT_CODE} language="typescript" />
        </DocSection>

        <DocSection title="onCleanup vs onUnmount" id="diff"
          description="Quick reference: choose the right hook for the job.">
          <CodeBlock code={DIFF_CODE} language="typescript" />
          <div class="mt-3 overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b border-[var(--line-default)]">
                  <th class="text-left py-2 pr-4 text-[var(--content-muted)] font-medium">Hook</th>
                  <th class="text-left py-2 pr-4 text-[var(--content-muted)] font-medium">Scope</th>
                  <th class="text-left py-2 text-[var(--content-muted)] font-medium">Runs when</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-[var(--line-default)]/50">
                  <td class="py-2 pr-4 font-mono text-xs text-indigo-400">onCleanup()</td>
                  <td class="py-2 pr-4 text-[var(--content-secondary)]">Effect</td>
                  <td class="py-2 text-[var(--content-secondary)]">Before each effect re-run + on unmount</td>
                </tr>
                <tr class="border-b border-[var(--line-default)]/50">
                  <td class="py-2 pr-4 font-mono text-xs text-indigo-400">onUnmount()</td>
                  <td class="py-2 pr-4 text-[var(--content-secondary)]">Component</td>
                  <td class="py-2 text-[var(--content-secondary)]">Once, when component is removed from DOM</td>
                </tr>
                <tr>
                  <td class="py-2 pr-4 font-mono text-xs text-indigo-400">destroyed()</td>
                  <td class="py-2 pr-4 text-[var(--content-secondary)]">Component</td>
                  <td class="py-2 text-[var(--content-secondary)]">Same as onUnmount — hook-style declaration</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DocSection>

        <DocSection title="Lifecycle hooks" id="api">
          <ApiTable rows={HOOKS_API} />
        </DocSection>

        <DocSection title="Utility functions" id="utils-api">
          <ApiTable rows={UTILS_API} />
        </DocSection>
      </div>
    );
  },
});

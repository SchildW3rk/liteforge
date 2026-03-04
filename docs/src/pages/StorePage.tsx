import { createComponent } from 'liteforge';
import { defineStore } from 'liteforge/store';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example ─────────────────────────────────────────────────────────────

type HistoryEntry = { action: string; value: number };

function StoreExample(): Node {
  const counter = defineStore('docs-counter', {
    state: { count: 0 },
    getters: (state) => ({
      isNegative: () => state.count() < 0,
      isZero:     () => state.count() === 0,
    }),
    actions: (state) => ({
      increment() { state.count.update(n => n + 1); },
      decrement() { state.count.update(n => n - 1); },
      reset()     { state.count.set(0); },
    }),
  });

  const history = signal<HistoryEntry[]>([]);

  function dispatch(action: string) {
    if (action === 'increment') counter.increment();
    else if (action === 'decrement') counter.decrement();
    else counter.reset();
    history.update(h => [{ action, value: counter.count() }, ...h].slice(0, 5));
  }

  return (
    <div class="space-y-4 max-w-sm">
      {/* Counter display */}
      <div class="flex items-center gap-3">
        <span class="text-4xl font-bold text-[var(--content-primary)] tabular-nums" style="min-width:3rem;text-align:center">
          {() => String(counter.count())}
        </span>
        {() => counter.isNegative() ? <Badge variant="red">negative</Badge>     : null}
        {() => counter.isZero()     ? <Badge variant="neutral">zero</Badge>     : null}
      </div>

      {/* Buttons */}
      <div class="flex gap-2">
        <Button variant="neutral" onclick={() => dispatch('decrement')}>−</Button>
        <Button variant="primary" onclick={() => dispatch('increment')}>+</Button>
        <Button variant="neutral" onclick={() => dispatch('reset')}>Reset</Button>
      </div>

      {/* History */}
      {() => history().length > 0
        ? (
          <div class="space-y-1">
            <p class="text-xs text-[var(--content-muted)] uppercase tracking-widest">Recent actions</p>
            {() => history().map((entry, i) => (
              <div class={`flex items-center justify-between text-xs px-2 py-1 rounded ${i === 0 ? 'bg-[var(--surface-overlay)] text-[var(--content-primary)]' : 'text-[var(--content-muted)]'}`}>
                <span class="font-mono">{entry.action}</span>
                <span>→ {entry.value}</span>
              </div>
            ))}
          </div>
        )
        : null}
    </div>
  );
}

// ─── Code strings ─────────────────────────────────────────────────────────────

const SETUP_CODE = `import { defineStore } from 'liteforge/store';

const userStore = defineStore('users', {
  state: {
    currentUser: null as User | null,
    list:        [] as User[],
    loading:     false,
  },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
    userCount:  () => state.list().length,
  }),
  actions: (state) => ({
    async fetchUsers() {
      state.loading.set(true);
      state.list.set(await fetch('/api/users').then(r => r.json()));
      state.loading.set(false);
    },
    logout() {
      state.currentUser.set(null);
    },
  }),
});

// Usage
userStore.fetchUsers();
userStore.isLoggedIn()  // Signal<boolean> — auto-tracks
userStore.list()        // Signal<User[]>`;

const LIVE_CODE = `const counter = defineStore('counter', {
  state: { count: 0 },
  getters: (state) => ({
    isNegative: () => state.count() < 0,
  }),
  actions: (state) => ({
    increment() { state.count.update(n => n + 1); },
    decrement() { state.count.update(n => n - 1); },
    reset()     { state.count.set(0); },
  }),
});

// Reactive read:
counter.count()       // Signal — auto-updates in JSX
counter.isNegative()  // computed getter

// Actions:
counter.increment();
counter.decrement();
counter.reset();`;

const PLUGINS_CODE = `import { defineStorePlugin, storeRegistry } from 'liteforge/store';

// Logger plugin
const loggerPlugin = defineStorePlugin({
  onAction(storeName, actionName, args) {
    console.log(\`[\${storeName}] \${actionName}\`, args);
  },
});

// Apply to a store
const myStore = defineStore('example', {
  state: { count: 0 },
  actions: (state) => ({
    increment() { state.count.update(n => n + 1); },
  }),
  plugins: [loggerPlugin],
});

// Global registry — inspect all stores
const allStores = storeRegistry.getAll();
const store = storeRegistry.get('example');`;

const TIME_TRAVEL_CODE = `import { devtoolsPlugin } from 'liteforge/devtools';

// Time-travel is built into devtools:
// 1. Integrate devtoolsPlugin() in createApp()
// 2. Open DevTools panel (default shortcut: Alt+D)
// 3. Switch to the Stores tab
// 4. Click any history entry to rewind state

// Manual snapshot/restore via store internals:
const snap = myStore.$snapshot();   // { count: 5 }
myStore.$restore(snap);             // rewind to that value`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const DEFINE_STORE_API: ApiRow[] = [
  { name: 'state', type: 'Record<string, unknown>', description: 'Initial state — each key becomes a Signal automatically' },
  { name: 'getters', type: '(state) => Record<string, () => T>', description: 'Computed values derived from state — memoized, auto-track dependencies' },
  { name: 'actions', type: '(state) => Record<string, Function>', description: 'Methods that read/write state — can be async' },
  { name: 'plugins', type: 'StorePlugin[]', description: 'Array of plugins to apply — see defineStorePlugin()' },
];

const STORE_INSTANCE_API: ApiRow[] = [
  { name: 'state[key]()', type: 'T', description: 'Read signal value — call in effect/computed to auto-track' },
  { name: 'state[key].set(v)', type: 'void', description: 'Set signal value directly' },
  { name: 'state[key].update(fn)', type: 'void', description: 'Update signal value with a transform function' },
  { name: 'getters[name]()', type: 'T', description: 'Read a computed getter — memoized until dependencies change' },
  { name: 'actions[name](...)', type: 'void | Promise', description: 'Call an action — can be sync or async' },
  { name: '$snapshot()', type: 'object', description: 'Get a plain-object snapshot of the current state' },
  { name: '$restore(snap)', type: 'void', description: 'Restore state from a snapshot (used by devtools time-travel)' },
];

export const StorePage = createComponent({
  name: 'StorePage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/store</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Store</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Signal-based global state management. Define state, computed getters, and
            async actions in one place. Zero boilerplate — no reducers, no dispatches.
          </p>
          <CodeBlock code={`pnpm add @liteforge/store`} language="bash" />
          <CodeBlock code={`import { defineStore } from 'liteforge/store';`} language="typescript" />
        </div>

        <DocSection
          title="defineStore()"
          id="define-store"
          description="Pass a unique name, state shape, optional getters, and actions. State keys become signals automatically."
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={DEFINE_STORE_API} />
          </div>
        </DocSection>

        <DocSection
          title="Store instance"
          id="instance"
          description="The returned store exposes state signals, getters, and actions directly on the object."
        >
          <ApiTable rows={STORE_INSTANCE_API} />
        </DocSection>

        <DocSection
          title="Live example"
          id="live"
          description="Counter store with getters, actions, and a 5-entry action history."
        >
          <LiveExample
            title="Counter store"
            description="Uses defineStore with getters + actions"
            component={StoreExample}
            code={LIVE_CODE}
          />
        </DocSection>

        <DocSection
          title="Plugins"
          id="plugins"
          description="Plugins intercept actions and state changes globally. Use defineStorePlugin() to create one."
        >
          <CodeBlock code={PLUGINS_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Time-travel"
          id="time-travel"
          description="Devtools integration enables time-travel debugging — rewind state to any previous snapshot."
        >
          <CodeBlock code={TIME_TRAVEL_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});

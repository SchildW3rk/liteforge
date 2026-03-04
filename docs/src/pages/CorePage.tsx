import { createComponent } from 'liteforge';
import { signal, computed } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import { inputClass } from '../components/Input.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live examples ──────────────────────────────────────────────────────────

const CounterExample = createComponent({
  name: 'CounterExample',
  component() {
    const count = signal(0);
    const doubled = computed(() => count() * 2);

    return (
      <div class="flex items-center gap-4">
        <button class={btnClass('primary')} onclick={() => count.update(n => n + 1)}>Increment</button>
        <button class={btnClass('secondary')} onclick={() => count.set(0)}>Reset</button>
        <span class="text-sm text-[var(--content-secondary)] font-mono">
          {() => `count = ${count()},  doubled = ${doubled()}`}
        </span>
      </div>
    );
  },
});

const FullNameExample = createComponent({
  name: 'FullNameExample',
  component() {
    const firstName = signal('Anna');
    const lastName = signal('Müller');
    const fullName = computed(() => `${firstName()} ${lastName()}`);

    return (
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">First name</label>
          <input
            class={inputClass({ size: 'sm', extra: 'w-36' })}
            value={() => firstName()}
            oninput={(e: InputEvent) => firstName.set((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">Last name</label>
          <input
            class={inputClass({ size: 'sm', extra: 'w-36' })}
            value={() => lastName()}
            oninput={(e: InputEvent) => lastName.set((e.target as HTMLInputElement).value)}
          />
        </div>
        <p class="text-sm font-semibold text-indigo-300 font-mono">
          {() => `fullName = "${fullName()}"`}
        </p>
      </div>
    );
  },
});

// ─── Code strings ────────────────────────────────────────────────────────────

const SIGNAL_CODE = `import { signal } from 'liteforge';

const count = signal(0);

count();            // read → 0
count.set(5);       // write → 5
count.update(n => n + 1);  // functional update → 6`;

const COMPUTED_CODE = `import { signal, computed } from 'liteforge';

const firstName = signal('Anna');
const lastName  = signal('Müller');

// Automatically tracks firstName and lastName
const fullName = computed(() => \`\${firstName()} \${lastName()}\`);

fullName();  // → 'Anna Müller'

firstName.set('Maria');
fullName();  // → 'Maria Müller' (re-computed lazily)`;

const EFFECT_CODE = `import { signal, effect } from 'liteforge';

const user = signal<{ name: string; role: string } | null>(null);

// Runs once immediately, then re-runs whenever user() changes
const dispose = effect(() => {
  if (user() !== null) {
    document.title = \`Welcome, \${user()?.name}\`;
  }
});

user.set({ name: 'Anna', role: 'admin' });
// → document.title = 'Welcome, Anna'

dispose(); // stop the effect`;

const BATCH_CODE = `import { signal, effect, batch } from 'liteforge';

const firstName = signal('Anna');
const lastName  = signal('Müller');

effect(() => {
  // Without batch: this would run twice (once per set)
  console.log(firstName(), lastName());
});

// With batch: effect runs exactly once after both updates
batch(() => {
  firstName.set('Maria');
  lastName.set('Schmidt');
});
// → logs 'Maria Schmidt' once`;

const COUNTER_CODE = `const count = signal(0);
const doubled = computed(() => count() * 2);

<button onclick={() => count.update(n => n + 1)}>Increment</button>
<span>{() => \`count = \${count()},  doubled = \${doubled()}\`}</span>`;

const FULLNAME_CODE = `const firstName = signal('Anna');
const lastName  = signal('Müller');
const fullName  = computed(() => \`\${firstName()} \${lastName()}\`);

<input value={() => firstName()} oninput={e => firstName.set(e.target.value)} />
<input value={() => lastName()}  oninput={e => lastName.set(e.target.value)}  />
<p>{() => fullName()}</p>`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const SIGNAL_API: ApiRow[] = [
  { name: 'signal(initial)', type: 'Signal<T>', description: 'Creates a reactive signal with an initial value' },
  { name: 'sig()', type: 'T', description: 'Reads the current value — tracked inside effect/computed' },
  { name: 'sig.set(value)', type: 'void', description: 'Sets a new value directly' },
  { name: 'sig.update(fn)', type: 'void', description: 'Updates value via a function: fn receives current value' },
];

const COMPUTED_API: ApiRow[] = [
  { name: 'computed(fn)', type: 'ReadonlySignal<T>', description: 'Creates a derived signal — recalculates lazily when dependencies change' },
  { name: 'derived()', type: 'T', description: 'Reads the computed value — tracked inside other effects/computed' },
];

const EFFECT_API: ApiRow[] = [
  { name: 'effect(fn)', type: 'DisposeFn', description: 'Runs fn immediately and re-runs when any signal read inside it changes' },
  { name: 'dispose()', type: 'void', description: 'Stop the effect — no more re-runs' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export const CorePage = createComponent({
  name: 'CorePage',
  component() {
    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/core</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Signals & Reactivity</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            The reactive foundation of LiteForge. Fine-grained signals that track their dependencies
            automatically — no subscriptions, no manual cleanup, no VDOM diffing.
          </p>
          <CodeBlock code={`pnpm add @liteforge/core`} language="bash" />
          <CodeBlock code={`import { signal, computed, effect, batch } from 'liteforge';`} language="typescript" />
        </div>

        {/* Concepts */}
        <DocSection
          title="How it works"
          id="how-it-works"
          description="Every signal() call creates a reactive cell. When you read a signal inside an effect() or computed(), it registers as a dependency automatically. When the signal changes, only the effects and computed values that depend on it re-run — nothing else."
        />

        {/* signal() */}
        <DocSection
          title="signal()"
          id="signal"
          description="The building block of reactivity. A signal holds a value and notifies dependents when it changes."
        >
          <div>
            <CodeBlock code={SIGNAL_CODE} language="typescript" />
            <ApiTable rows={SIGNAL_API} />
          </div>
        </DocSection>

        {/* computed() */}
        <DocSection
          title="computed()"
          id="computed"
          description="Derives a value from one or more signals. Lazy — only recalculates when a dependency changed and the value is actually read."
        >
          <div>
            <CodeBlock code={COMPUTED_CODE} language="typescript" />
            <ApiTable rows={COMPUTED_API} />
            <LiveExample
              title="computed() — fullName"
              description="Derived from two signals"
              component={FullNameExample}
              code={FULLNAME_CODE}
            />
          </div>
        </DocSection>

        {/* effect() */}
        <DocSection
          title="effect()"
          id="effect"
          description="Runs a side effect when dependencies change. Returns a dispose function to stop tracking."
        >
          <div>
            <CodeBlock code={EFFECT_CODE} language="typescript" />
            <ApiTable rows={EFFECT_API} />
          </div>
        </DocSection>

        {/* batch() */}
        <DocSection
          title="batch()"
          id="batch"
          description="Groups multiple signal updates so dependent effects run only once after all updates complete."
        >
          <CodeBlock code={BATCH_CODE} language="typescript" />
        </DocSection>

        {/* Live demo */}
        <DocSection title="Live example" id="live">
          <LiveExample
            title="signal + computed counter"
            component={CounterExample}
            code={COUNTER_CODE}
          />
        </DocSection>

        {/* Patterns */}
        <DocSection title="Patterns" id="patterns">
          <div class="space-y-4 text-sm">
            <div class="p-4 rounded-lg border border-emerald-800/40 bg-emerald-950/20">
              <p class="font-semibold text-emerald-300 mb-1">✓ Read signals inside effects/JSX expressions</p>
              <p class="text-[var(--content-secondary)]">Signals are only tracked when read inside a reactive context (effect, computed, or <code class="font-mono text-xs bg-[var(--surface-overlay)] px-1 rounded">{'{() => signal()}'}</code> in JSX).</p>
            </div>
            <div class="p-4 rounded-lg border border-red-800/40 bg-red-950/20">
              <p class="font-semibold text-red-300 mb-1">✗ Don't read signals outside reactive contexts to "cache" them</p>
              <p class="text-[var(--content-secondary)]">Reading a signal outside of an effect or computed snapshot its value at that moment — changes won't be tracked.</p>
            </div>
          </div>
        </DocSection>
      </div>
    );
  },
});

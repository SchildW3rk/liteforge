import { createComponent, use } from 'liteforge';
import { signal, computed } from 'liteforge';
import { setToc } from '../toc.js';
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
    const { t } = use('i18n');
    const firstName = signal('Anna');
    const lastName = signal('Müller');
    const fullName = computed(() => `${firstName()} ${lastName()}`);

    return (
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">{() => t('core.firstName')}</label>
          <input
            class={inputClass({ size: 'sm', extra: 'w-36' })}
            value={() => firstName()}
            oninput={(e: InputEvent) => firstName.set((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">{() => t('core.lastName')}</label>
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


// ─── Page ─────────────────────────────────────────────────────────────────────

export const CorePage = createComponent({
  name: 'CorePage',
  component() {
    const { t } = use('i18n');

    const getSignalApi = (): ApiRow[] => [
      { name: 'signal(initial)', type: 'Signal<T>',         description: t('core.apiSignal')  },
      { name: 'sig()',           type: 'T',                 description: t('core.apiRead')    },
      { name: 'sig.set(value)',  type: 'void',              description: t('core.apiSet')     },
      { name: 'sig.update(fn)',  type: 'void',              description: t('core.apiUpdate')  },
    ];

    const getComputedApi = (): ApiRow[] => [
      { name: 'computed(fn)',    type: 'ReadonlySignal<T>', description: t('core.apiComputed') },
      { name: 'derived()',       type: 'T',                description: t('core.apiDerived')  },
    ];

    const getEffectApi = (): ApiRow[] => [
      { name: 'effect(fn)',      type: 'DisposeFn',        description: t('core.apiEffect')  },
      { name: 'dispose()',       type: 'void',             description: t('core.apiDispose') },
    ];

    setToc([
      { id: 'how-it-works', label: () => t('core.howItWorks'),    level: 2 },
      { id: 'signal',       label: () => t('core.signal'),         level: 2 },
      { id: 'computed',     label: () => t('core.computed'),        level: 2 },
      { id: 'effect',       label: () => t('core.effect'),          level: 2 },
      { id: 'batch',        label: () => t('core.batch'),           level: 2 },
      { id: 'patterns',     label: () => t('core.patterns'),        level: 2 },
      { id: 'live',         label: () => t('core.liveExample'),     level: 2 },
    ]);
    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/core</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('core.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('core.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/core`} language="bash" />
          <CodeBlock code={`import { signal, computed, effect, batch } from 'liteforge';`} language="typescript" />
        </div>

        {/* Concepts */}
        <DocSection
          title={() => t('core.howItWorks')}
          id="how-it-works"
          description={() => t('core.howItWorksDesc')}
        />

        {/* signal() */}
        <DocSection
          title={() => t('core.signal')}
          id="signal"
          description={() => t('core.signalDesc')}
        >
          <div>
            <CodeBlock code={SIGNAL_CODE} language="typescript" />
            <ApiTable rows={() => getSignalApi()} />
          </div>
        </DocSection>

        {/* computed() */}
        <DocSection
          title={() => t('core.computed')}
          id="computed"
          description={() => t('core.computedDesc')}
        >
          <div>
            <CodeBlock code={COMPUTED_CODE} language="typescript" />
            <ApiTable rows={() => getComputedApi()} />
            <LiveExample
              title={() => t('core.computedTitle')}
              description={() => t('core.computedDescEx')}
              component={FullNameExample}
              code={FULLNAME_CODE}
            />
          </div>
        </DocSection>

        {/* effect() */}
        <DocSection
          title={() => t('core.effect')}
          id="effect"
          description={() => t('core.effectDesc')}
        >
          <div>
            <CodeBlock code={EFFECT_CODE} language="typescript" />
            <ApiTable rows={() => getEffectApi()} />
          </div>
        </DocSection>

        {/* batch() */}
        <DocSection
          title={() => t('core.batch')}
          id="batch"
          description={() => t('core.batchDesc')}
        >
          <CodeBlock code={BATCH_CODE} language="typescript" />
        </DocSection>

        {/* Live demo */}
        <DocSection title={() => t('core.liveExample')} id="live">
          <LiveExample
            title={() => t('core.liveTitle')}
            component={CounterExample}
            code={COUNTER_CODE}
          />
        </DocSection>

        {/* Patterns */}
        <DocSection title={() => t('core.patterns')} id="patterns">
          <div class="space-y-4 text-sm">
            <div class="p-4 border border-emerald-800/40 bg-emerald-950/20" style="border-radius: var(--lf-radius)">
              <p class="font-semibold text-emerald-300 mb-1">{() => t('core.patternDo')}</p>
              <p class="text-[var(--content-secondary)]">{() => t('core.patternDoDesc', { code: '{() => signal()}' })}</p>
            </div>
            <div class="p-4 border border-red-800/40 bg-red-950/20" style="border-radius: var(--lf-radius)">
              <p class="font-semibold text-red-300 mb-1">{() => t('core.patternDont')}</p>
              <p class="text-[var(--content-secondary)]">{() => t('core.patternDontDesc')}</p>
            </div>
          </div>
        </DocSection>
      </div>
    );
  },
});

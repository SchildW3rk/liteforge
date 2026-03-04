import { createComponent } from '@liteforge/runtime';
import { Link } from '@liteforge/router';
import { CodeBlock } from '../components/CodeBlock.js';

type BadgeToken = 'violet' | 'blue' | 'emerald' | 'amber';

interface PackageCard {
  name: string;
  href: string;
  description: string;
  badge: string;
  token: BadgeToken;
}

const BADGE_CLASSES: Record<BadgeToken, string> = {
  violet:  'bg-[var(--badge-violet-bg)] text-[var(--badge-violet-text)] border border-[var(--badge-violet-border)]',
  blue:    'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] border border-[var(--badge-blue-border)]',
  emerald: 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border border-[var(--badge-emerald-border)]',
  amber:   'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border border-[var(--badge-amber-border)]',
};

const PACKAGES: PackageCard[] = [
  { name: 'core',     href: '/core',     description: 'Signals, computed, effects — the reactive foundation',     badge: 'foundation', token: 'violet'  },
  { name: 'runtime',  href: '/runtime',  description: 'Components, JSX, lifecycle, control flow',                 badge: 'foundation', token: 'violet'  },
  { name: 'router',   href: '/router',   description: 'Client-side routing with guards and lazy loading',          badge: 'routing',    token: 'blue'    },
  { name: 'query',    href: '/query',    description: 'Data fetching with automatic caching and invalidation',     badge: 'data',       token: 'emerald' },
  { name: 'client',   href: '/client',   description: 'TypeScript-first HTTP client with resource CRUD',           badge: 'data',       token: 'emerald' },
  { name: 'form',     href: '/form',     description: 'Form state management with Zod validation',                badge: 'ui',         token: 'amber'   },
  { name: 'table',    href: '/table',    description: 'Reactive data grid with sort, filter, pagination',          badge: 'ui',         token: 'amber'   },
  { name: 'calendar', href: '/calendar', description: 'Scheduling calendar with 4 views and drag & drop',          badge: 'ui',         token: 'amber'   },
];

// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';
const QUICKSTART = `import { signal, computed } from '@liteforge/core';
import { ${_cc} } from '@liteforge/runtime';

const Counter = ${_cc}({
  name: 'Counter',
  component() {
    const count = signal(0);
    const doubled = computed(() => count() * 2);

    return (
      <div>
        <button onclick={() => count.update(n => n + 1)}>
          Count: {() => count()}
        </button>
        <p>Doubled: {() => doubled()}</p>
      </div>
    );
  },
});`;

export const Overview = createComponent({
  name: 'Overview',
  component() {
    return (
      <div>
        {/* Hero */}
        <div class="mb-14">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--badge-indigo-border)] bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] text-xs font-medium mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Signals-based · No Virtual DOM · TypeScript-first
          </div>

          <h1 class="text-4xl font-bold text-[var(--content-primary)] mb-3 tracking-tight">
            LiteForge
          </h1>
          <p class="text-lg text-[var(--content-secondary)] leading-relaxed max-w-xl mb-6">
            A modular frontend framework built around fine-grained reactivity.
            Direct DOM updates, zero virtual DOM overhead, and a clean component model.
          </p>

          <div class="flex flex-wrap items-center gap-3">
            {Link({
              href: '/core',
              class: 'inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors',
              children: 'Get started →',
            })}
            <a
              href="https://github.com/schildw3rk/liteforge"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] text-sm font-medium transition-colors"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* Feature highlights */}
        <div class="grid grid-cols-2 gap-3 mb-12">
          {[
            { icon: '⚡', title: 'Fine-grained reactivity', desc: 'Signal-based — only what changed re-renders' },
            { icon: '🚫', title: 'No Virtual DOM', desc: 'Direct DOM manipulation, no diffing overhead' },
            { icon: '🔷', title: 'TypeScript-first', desc: 'Strict types everywhere, zero any in public APIs' },
            { icon: '📦', title: 'Modular packages', desc: 'Use only what you need — each package is standalone' },
          ].map(f => (
            <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/50">
              <div class="text-xl mb-2">{f.icon}</div>
              <p class="text-sm font-semibold text-[var(--content-primary)] mb-0.5">{f.title}</p>
              <p class="text-xs text-[var(--content-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick start */}
        <div class="mb-12">
          <h2 class="text-lg font-semibold text-[var(--content-primary)] mb-1">Quick start</h2>
          <p class="text-sm text-[var(--content-secondary)] mb-3">A reactive counter in 15 lines:</p>
          <CodeBlock code={QUICKSTART} language="tsx" />
        </div>

        {/* Package map */}
        <div class="mb-10">
          <h2 class="text-lg font-semibold text-[var(--content-primary)] mb-4">Packages</h2>
          <div class="grid grid-cols-1 gap-2">
            {PACKAGES.map(pkg => (
              <div>
                {Link({
                  href: pkg.href,
                  children: (
                    <div class="flex items-center justify-between p-3 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-subtle)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)] transition-all group">
                      <div class="flex items-center gap-3">
                        <span class="font-mono text-sm text-indigo-300 group-hover:text-indigo-200">
                          @liteforge/{pkg.name}
                        </span>
                        <span class="text-xs text-[var(--content-muted)]">{pkg.description}</span>
                      </div>
                      <span class={`text-[0.65rem] px-1.5 py-0.5 rounded font-medium ${BADGE_CLASSES[pkg.token]}`}>
                        {pkg.badge}
                      </span>
                    </div>
                  ),
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
});

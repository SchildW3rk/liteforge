import { createComponent } from 'liteforge';
import { Link } from 'liteforge/router';
import { CodeBlock } from '../components/CodeBlock.js';

type BadgeToken = 'violet' | 'blue' | 'emerald' | 'amber';

interface PackageCard {
  name: string;
  label: string;
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
  { name: 'core',      label: 'Signals & Reactivity', href: '/core',      description: 'Signals, computed, effects — the reactive foundation',            badge: 'foundation', token: 'violet'  },
  { name: 'runtime',   label: 'Components & JSX',     href: '/runtime',   description: 'Components, JSX, lifecycle, control flow',                        badge: 'foundation', token: 'violet'  },
  { name: 'router',    label: 'Router',               href: '/router',    description: 'Client-side routing with guards and lazy loading',                 badge: 'routing',    token: 'blue'    },
  { name: 'query',     label: 'Data Fetching',        href: '/query',     description: 'Data fetching with automatic caching and invalidation',            badge: 'data',       token: 'emerald' },
  { name: 'client',    label: 'HTTP Client',          href: '/client',    description: 'TypeScript-first HTTP client with resource CRUD',                  badge: 'data',       token: 'emerald' },
  { name: 'form',      label: 'Forms',                href: '/form',      description: 'Form state management with Zod validation',                       badge: 'ui',         token: 'amber'   },
  { name: 'table',     label: 'Tables',               href: '/table',     description: 'Reactive data grid with sort, filter, pagination',                 badge: 'ui',         token: 'amber'   },
  { name: 'modal',     label: 'Modal',                href: '/modal',     description: 'Portal-based modal system with typed data passing',                badge: 'ui',         token: 'amber'   },
  { name: 'toast',     label: 'Toast',                href: '/toast',     description: 'Imperative toast notifications with four variants',                badge: 'ui',         token: 'amber'   },
  { name: 'tooltip',   label: 'Tooltip',              href: '/tooltip',   description: 'Portal-based tooltips with auto-positioning and delay',            badge: 'ui',         token: 'amber'   },
  { name: 'calendar',  label: 'Calendar',             href: '/calendar',  description: 'Scheduling calendar with 4 views and drag & drop',                badge: 'ui',         token: 'amber'   },
  { name: 'i18n',      label: 'Internationalization', href: '/i18n',      description: 'Reactive i18n with lazy locale loading and pluralization',         badge: 'plugin',     token: 'blue'    },
  { name: 'admin',     label: 'Admin Panel',          href: '/admin',     description: 'Full admin scaffold with sidebar, CRUD pages, and auth guards',   badge: 'plugin',     token: 'blue'    },
];

// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';
const QUICKSTART = `import { signal, computed } from 'liteforge';
import { ${_cc} } from 'liteforge';

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
        <div class="mb-10">
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
              href: '/app',
              class: 'inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors',
              children: 'Get started →',
            })}
            <a
              href="https://github.com/SchildW3rk/liteforge"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] text-sm font-medium transition-colors"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* Install */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">Install</h2>
          <CodeBlock code="npm install liteforge @liteforge/router" language="bash" />
        </div>

        {/* Why LiteForge */}
        <div class="mb-10 p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/50">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-3">Why LiteForge</h2>
          <div class="grid grid-cols-1 gap-2">
            {[
              { label: 'No Virtual DOM', desc: 'Signals drive direct DOM mutations — no diffing, no reconciler, no wasted renders.' },
              { label: 'No build magic', desc: 'Standard Vite plugin, standard TypeScript, standard ESM. Nothing hidden.' },
              { label: 'No runtime overhead', desc: 'Effects only re-run the exact code that reads changed signals — granular by design.' },
            ].map(item => (
              <div class="flex gap-3 py-1.5">
                <span class="text-[var(--badge-emerald-text)] font-mono text-xs mt-0.5">✓</span>
                <div>
                  <span class="text-sm font-medium text-[var(--content-primary)]">{item.label}</span>
                  <span class="text-sm text-[var(--content-muted)] ml-2">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-3">Performance</h2>
          <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/50">
            <p class="text-xs text-[var(--content-muted)] mb-3">
              js-framework-benchmark — geometric mean of all metrics (lower is better)
            </p>
            <div class="space-y-2">
              {[
                { name: 'Vanilla JS',  score: '1.00', pct: 100, color: 'bg-emerald-500' },
                { name: 'LiteForge',   score: '1.04', pct: 96,  color: 'bg-indigo-500'  },
                { name: 'Solid',       score: '1.06', pct: 94,  color: 'bg-blue-500'    },
                { name: 'Vue 3',       score: '1.38', pct: 72,  color: 'bg-green-500'   },
                { name: 'React 18',    score: '1.55', pct: 64,  color: 'bg-sky-500'     },
              ].map(f => (
                <div class="flex items-center gap-3">
                  <span class="text-xs text-[var(--content-secondary)] w-20 shrink-0">{f.name}</span>
                  <div class="flex-1 h-1.5 rounded-full bg-[var(--surface-overlay)]">
                    <div
                      class={`h-1.5 rounded-full ${f.color}`}
                      style={`width:${f.pct}%`}
                    />
                  </div>
                  <span class="text-xs font-mono text-[var(--content-muted)] w-8 text-right">{f.score}</span>
                </div>
              ))}
            </div>
            <p class="text-[0.65rem] text-[var(--content-subtle)] mt-3">
              Approximate — run <span class="font-mono">pnpm --filter starter dev</span> and navigate to <span class="font-mono">/benchmark</span> for live results.
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div class="grid grid-cols-2 gap-3 mb-10">
          {[
            { icon: '⚡', title: 'Fine-grained reactivity', desc: 'Signal-based — only what changed re-renders' },
            { icon: '🚫', title: 'No Virtual DOM',          desc: 'Direct DOM manipulation, no diffing overhead' },
            { icon: '🔷', title: 'TypeScript-first',        desc: 'Strict types everywhere, zero any in public APIs' },
            { icon: '📦', title: 'Modular packages',        desc: 'Use only what you need — each package is standalone' },
          ].map(f => (
            <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/50">
              <div class="text-xl mb-2">{f.icon}</div>
              <p class="text-sm font-semibold text-[var(--content-primary)] mb-0.5">{f.title}</p>
              <p class="text-xs text-[var(--content-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick start */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">Quick start</h2>
          <p class="text-sm text-[var(--content-secondary)] mb-3">A reactive counter in 15 lines:</p>
          <CodeBlock code={QUICKSTART} language="tsx" />
        </div>

        {/* Package map */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-4">Packages</h2>
          <div class="grid grid-cols-1 gap-1.5">
            {PACKAGES.map(pkg => (
              <div>
                {Link({
                  href: pkg.href,
                  children: (
                    <div class="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-subtle)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)] transition-all group">
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="font-mono text-xs text-[var(--badge-indigo-text)] group-hover:text-indigo-200 shrink-0">
                          {pkg.label}
                        </span>
                        <span class="text-xs text-[var(--content-muted)] truncate">{pkg.description}</span>
                      </div>
                      <span class={`text-[0.65rem] px-1.5 py-0.5 rounded font-medium shrink-0 ml-3 ${BADGE_CLASSES[pkg.token]}`}>
                        {pkg.badge}
                      </span>
                    </div>
                  ),
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Get started CTA */}
        <div class="border border-[var(--line-default)] rounded-lg p-6 text-center mb-4 bg-[var(--surface-raised)]/30">
          <h2 class="text-base font-semibold text-[var(--content-primary)] mb-1">Ready to build?</h2>
          <p class="text-sm text-[var(--content-muted)] mb-4">Set up a new app in under 5 minutes.</p>
          <div class="flex justify-center gap-3">
            {Link({
              href: '/app',
              class: 'inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors',
              children: 'App Bootstrap →',
            })}
            {Link({
              href: '/core',
              class: 'inline-flex items-center px-5 py-2.5 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] text-sm font-medium transition-colors',
              children: 'Core concepts',
            })}
          </div>
        </div>

      </div>
    );
  },
});

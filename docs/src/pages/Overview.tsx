import { createComponent, use } from 'liteforge';
import { Link } from 'liteforge/router';
import { clearToc } from '../toc.js';
import { CodeBlock } from '../components/CodeBlock.js';
import type { ExtractKeys } from 'liteforge/i18n';
import type { DocsTranslations } from '../locales/en.js';

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

// Translation key → package name mapping
const PKG_DESC_KEY: Record<string, ExtractKeys<DocsTranslations>> = {
  core: 'pkg.core', runtime: 'pkg.runtime', router: 'pkg.router', query: 'pkg.query',
  client: 'pkg.client', form: 'pkg.form', table: 'pkg.table', modal: 'pkg.modal',
  toast: 'pkg.toast', tooltip: 'pkg.tooltip', calendar: 'pkg.calendar',
  i18n: 'pkg.i18n', admin: 'pkg.admin',
};

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
    const { t } = use('i18n');
    clearToc();
    return (
      <div>
        {/* Hero */}
        <div class="mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--badge-indigo-border)] bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] text-xs font-medium mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            {() => t('overview.tagline')}
          </div>

          <h1 class="text-4xl font-bold text-[var(--content-primary)] mb-3 tracking-tight">
            {() => t('overview.title')}
          </h1>
          <p class="text-lg text-[var(--content-secondary)] leading-relaxed max-w-xl mb-6">
            {() => t('overview.subtitle')}
          </p>

          <div class="flex flex-wrap items-center gap-3">
            {Link({
              href: '/app',
              class: 'inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors',
              children: () => t('overview.getStarted'),
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
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">{() => t('overview.install')}</h2>
          <CodeBlock code="npm install liteforge @liteforge/router" language="bash" />
        </div>

        {/* Why LiteForge */}
        <div class="mb-10 p-4 border border-[var(--line-default)] bg-[var(--surface-raised)]/50" style="border-radius: var(--lf-radius)">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-3">{() => t('overview.why')}</h2>
          <div class="grid grid-cols-1 gap-2">
            {([
              { labelKey: 'overview.whyItems.noVdom',       descKey: 'overview.whyItems.noVdomDesc'       },
              { labelKey: 'overview.whyItems.noBuildMagic', descKey: 'overview.whyItems.noBuildMagicDesc' },
              { labelKey: 'overview.whyItems.noOverhead',   descKey: 'overview.whyItems.noOverheadDesc'   },
            ] as const).map(item => (
              <div class="flex gap-3 py-1.5">
                <span class="text-[var(--badge-emerald-text)] font-mono text-xs mt-0.5">✓</span>
                <div>
                  <span class="text-sm font-medium text-[var(--content-primary)]">{() => t(item.labelKey)}</span>
                  <span class="text-sm text-[var(--content-muted)] ml-2">{() => t(item.descKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-3">{() => t('overview.performance')}</h2>
          <div class="p-4 border border-[var(--line-default)] bg-[var(--surface-raised)]/50" style="border-radius: var(--lf-radius)">
            <p class="text-xs text-[var(--content-muted)] mb-3">
              {() => t('overview.perfNote')}
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
              {() => t('overview.perfApprox', { cmd: 'pnpm --filter starter dev', path: '/benchmark' })}
            </p>
          </div>
        </div>

        {/* Quick start */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">{() => t('overview.quickstart')}</h2>
          <p class="text-sm text-[var(--content-secondary)] mb-3">{() => t('overview.quickstartDesc')}</p>
          <CodeBlock code={QUICKSTART} language="tsx" />
        </div>

        {/* Package map */}
        <div class="mb-10">
          <h2 class="text-sm font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-4">{() => t('overview.packages')}</h2>
          <div class="grid grid-cols-1 gap-1.5">
            {PACKAGES.map(pkg => (
              <div>
                {Link({
                  href: pkg.href,
                  children: (
                    <div class="flex items-center justify-between px-3 py-2 border border-[var(--line-default)] hover:border-[var(--content-subtle)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)] transition-all group" style="border-radius: var(--lf-radius)">
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="font-mono text-xs text-[var(--badge-indigo-text)] group-hover:text-indigo-200 shrink-0">
                          {pkg.label}
                        </span>
                        <span class="text-xs text-[var(--content-muted)] truncate">{() => t(PKG_DESC_KEY[pkg.name]!)}</span>
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
        <div class="border border-[var(--line-default)] p-6 text-center mb-4 bg-[var(--surface-raised)]/30" style="border-radius: var(--lf-radius)">
          <h2 class="text-base font-semibold text-[var(--content-primary)] mb-1">{() => t('overview.ready')}</h2>
          <p class="text-sm text-[var(--content-muted)] mb-4">{() => t('overview.readyDesc')}</p>
          <div class="flex justify-center gap-3">
            {Link({
              href: '/app',
              class: 'inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors',
              children: () => t('overview.appBootstrap'),
            })}
            {Link({
              href: '/core',
              class: 'inline-flex items-center px-5 py-2.5 rounded-lg border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] text-sm font-medium transition-colors',
              children: () => t('overview.coreConcepts'),
            })}
          </div>
        </div>

      </div>
    );
  },
});

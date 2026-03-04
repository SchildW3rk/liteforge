import { createComponent } from '@liteforge/runtime';
import { RouterOutlet, Link } from '@liteforge/router';
import { signal } from '@liteforge/core';
import { themeStore } from '../stores/theme.js';

interface NavGroup {
  label: string;
  links: Array<{ href: string; text: string; badge?: string; noPrefix?: boolean }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Foundation',
    links: [
      { href: '/core',     text: 'core',     badge: 'signals' },
      { href: '/runtime',  text: 'runtime',  badge: 'jsx'     },
      { href: '/store',    text: 'store',    badge: 'state'   },
      { href: '/devtools', text: 'devtools', badge: 'debug'   },
    ],
  },
  {
    label: 'Control Flow',
    links: [
      { href: '/control-flow', text: 'Show / Switch / For', badge: 'primitives', noPrefix: true },
    ],
  },
  {
    label: 'Routing',
    links: [
      { href: '/router', text: 'router' },
    ],
  },
  {
    label: 'Data',
    links: [
      { href: '/query', text: 'query' },
      { href: '/client', text: 'client' },
    ],
  },
  {
    label: 'UI',
    links: [
      { href: '/form',     text: 'form'     },
      { href: '/table',    text: 'table'    },
      { href: '/modal',    text: 'modal'    },
      { href: '/calendar', text: 'calendar' },
    ],
  },
  {
    label: 'Tools',
    links: [
      { href: '/benchmark', text: 'benchmark', badge: 'perf', noPrefix: true },
    ],
  },
];

export const Layout = createComponent({
  name: 'DocsLayout',
  component() {
    const mobileOpen = signal(false);

    const toggleMobile = () => mobileOpen.update(v => !v);
    const closeMobile  = () => mobileOpen.set(false);

    const sidebar = (
      <aside class="flex flex-col w-64 shrink-0 border-r border-[var(--line-default)] bg-[var(--surface-raised)] h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div class="flex items-center gap-2 px-5 py-4 border-b border-[var(--line-default)]">
          {Link({
            href: '/',
            children: (
              <span class="flex items-center gap-2">
                <span class="text-lg font-bold text-[var(--content-primary)] tracking-tight">LiteForge</span>
                <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)]">docs</span>
              </span>
            ),
          })}
        </div>

        {/* Nav */}
        <nav class="flex-1 px-3 py-4 space-y-5">
          {NAV_GROUPS.map(group => (
            <div>
              <p class="px-2 mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--content-muted)]">
                {group.label}
              </p>
              <ul class="space-y-0.5">
                {group.links.map(link => (
                  <li onclick={closeMobile}>
                    {Link({
                      href: link.href,
                      activeClass: 'lf-nav-active',
                      class: 'flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors font-mono',
                      children: (
                        <span class="flex items-center gap-2">
                          <span>{link.noPrefix === true ? link.text : `@liteforge/${link.text}`}</span>
                          {link.badge !== undefined
                            ? <span class="text-[0.6rem] px-1 py-0.5 rounded bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)]">{link.badge}</span>
                            : null}
                        </span>
                      ),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div class="px-5 py-3 border-t border-[var(--line-default)] flex items-center justify-between">
          <span class="text-xs text-[var(--content-subtle)]">MIT License</span>
          <button
            type="button"
            onclick={() => themeStore.toggle()}
            class="text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] transition-colors"
            title="Toggle light/dark"
          >
            {() => themeStore.label()}
          </button>
        </div>
      </aside>
    );

    return (
      <div class="min-h-screen bg-[var(--surface-base)] text-[var(--content-primary)] flex">
        {/* Mobile overlay */}
        {() => mobileOpen()
          ? <div class="fixed inset-0 z-20 bg-black/60 lg:hidden" onclick={closeMobile} />
          : null}

        {/* Mobile sidebar */}
        <div class={() => `fixed inset-y-0 left-0 z-30 lg:hidden transition-transform ${mobileOpen() ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebar}
        </div>

        {/* Desktop sidebar */}
        <div class="hidden lg:flex">
          {sidebar}
        </div>

        {/* Main */}
        <div class="flex-1 min-w-0">
          {/* Mobile header */}
          <header class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--line-default)] sticky top-0 bg-[var(--surface-base)]/95 backdrop-blur z-10">
            <button type="button" onclick={toggleMobile} class="text-[var(--content-secondary)] hover:text-[var(--content-primary)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span class="font-bold text-[var(--content-primary)] text-sm">LiteForge Docs</span>
          </header>

          <main class="px-6 py-10 max-w-3xl mx-auto">
            {RouterOutlet()}
          </main>
        </div>
      </div>
    );
  },
});

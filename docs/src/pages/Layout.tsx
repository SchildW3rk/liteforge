import { createComponent, signal } from 'liteforge';
import { RouterOutlet, Link } from 'liteforge/router';
import { tooltip } from 'liteforge/tooltip';
import { themeStore } from '../stores/theme.js';

// ─── Lucide icon helper ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconNode = any[][];

function icon(data: IconNode, cls = 'w-[15px] h-[15px] shrink-0'): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', cls);
  for (const [tag, attrs] of data) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}

// ─── Icon data ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IC = {
  zap:           [['path',{d:'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'}]],
  box:           [['path',{d:'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'}],['polyline',{points:'3.29 7 12 12 20.71 7'}],['line',{x1:'12',y1:'22',x2:'12',y2:'12'}]],
  refreshcw:     [['path',{d:'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'}],['path',{d:'M21 3v5h-5'}],['path',{d:'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'}],['path',{d:'M8 16H3v5'}]],
  gitbranch:     [['line',{x1:'6',y1:'3',x2:'6',y2:'15'}],['circle',{cx:'18',cy:'6',r:'3'}],['circle',{cx:'6',cy:'18',r:'3'}],['path',{d:'M18 9a9 9 0 0 1-9 9'}]],
  database:      [['ellipse',{cx:'12',cy:'5',rx:'9',ry:'3'}],['path',{d:'M3 5V19A9 3 0 0 0 21 19V5'}],['path',{d:'M3 12A9 3 0 0 0 21 12'}]],
  navigation:    [['polygon',{points:'3 11 22 2 13 21 11 13 3 11'}]],
  clouddownload: [['path',{d:'M12 13v8l-4-4'}],['path',{d:'M12 21l4-4'}],['path',{d:'M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284'}]],
  globe:         [['circle',{cx:'12',cy:'12',r:'10'}],['path',{d:'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'}],['path',{d:'M2 12h20'}]],
  clipboardlist: [['rect',{width:'8',height:'4',x:'8',y:'2',rx:'1',ry:'1'}],['path',{d:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'}],['path',{d:'M12 11h4'}],['path',{d:'M12 16h4'}],['path',{d:'M8 11h.01'}],['path',{d:'M8 16h.01'}]],
  table2:        [['path',{d:'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18'}]],
  layers:        [['path',{d:'m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z'}],['path',{d:'m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65'}],['path',{d:'m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'}]],
  bell:          [['path',{d:'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'}],['path',{d:'M10.3 21a1.94 1.94 0 0 0 3.4 0'}]],
  messagesquare: [['path',{d:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'}]],
  calendardays:  [['path',{d:'M8 2v4'}],['path',{d:'M16 2v4'}],['rect',{width:'18',height:'18',x:'3',y:'4',rx:'2'}],['path',{d:'M3 10h18'}],['path',{d:'M8 14h.01'}],['path',{d:'M12 14h.01'}],['path',{d:'M16 14h.01'}],['path',{d:'M8 18h.01'}],['path',{d:'M12 18h.01'}],['path',{d:'M16 18h.01'}]],
  languages:     [['path',{d:'m5 8 6 6'}],['path',{d:'m4 14 6-6 2-3'}],['path',{d:'M2 5h12'}],['path',{d:'M7 2h1'}],['path',{d:'m22 22-5-10-5 10'}],['path',{d:'M14 18h6'}]],
  shield:        [['path',{d:'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'}]],
  wrench:        [['path',{d:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'}]],
  barchart2:     [['line',{x1:'18',y1:'20',x2:'18',y2:'10'}],['line',{x1:'12',y1:'20',x2:'12',y2:'4'}],['line',{x1:'6',y1:'20',x2:'6',y2:'14'}]],
  rocket:        [['path',{d:'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'}],['path',{d:'m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'}],['path',{d:'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'}],['path',{d:'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'}]],
  chevrondown:   [['path',{d:'m6 9 6 6 6-6'}]],
  chevronright:  [['path',{d:'m9 18 6-6-6-6'}]],
  sun:           [['circle',{cx:'12',cy:'12',r:'4'}],['path',{d:'M12 2v2'}],['path',{d:'M12 20v2'}],['path',{d:'m4.93 4.93 1.41 1.41'}],['path',{d:'m17.66 17.66 1.41 1.41'}],['path',{d:'M2 12h2'}],['path',{d:'M20 12h2'}],['path',{d:'m6.34 17.66-1.41 1.41'}],['path',{d:'m19.07 4.93-1.41 1.41'}]],
  moon:          [['path',{d:'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'}]],
  // Sidebar toggle icons
  panelleft:     [['rect',{width:'18',height:'18',x:'3',y:'3',rx:'2'}],['path',{d:'M9 3v18'}]],
  panelright:    [['rect',{width:'18',height:'18',x:'3',y:'3',rx:'2'}],['path',{d:'M15 3v18'}]],
};

// ─── Nav data ─────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: IconNode;
}

interface NavGroup {
  id: string;
  label: string;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    links: [
      { href: '/app',          label: 'App Bootstrap',        icon: IC['rocket']       },
      { href: '/core',         label: 'Signals & Reactivity', icon: IC['zap']          },
      { href: '/runtime',      label: 'Components & JSX',     icon: IC['box']          },
      { href: '/lifecycle',    label: 'Lifecycle',            icon: IC['refreshcw']    },
      { href: '/store',        label: 'State Management',     icon: IC['database']     },
      { href: '/devtools',     label: 'DevTools',             icon: IC['wrench']       },
    ],
  },
  {
    id: 'control-flow',
    label: 'Control Flow',
    links: [
      { href: '/control-flow', label: 'Show / Switch / For',  icon: IC['gitbranch']   },
    ],
  },
  {
    id: 'routing',
    label: 'Routing',
    links: [
      { href: '/router',       label: 'Routing',              icon: IC['navigation']  },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    links: [
      { href: '/query',        label: 'Data Fetching',        icon: IC['clouddownload'] },
      { href: '/client',       label: 'HTTP Client',          icon: IC['globe']         },
    ],
  },
  {
    id: 'ui',
    label: 'UI',
    links: [
      { href: '/form',         label: 'Forms',                icon: IC['clipboardlist'] },
      { href: '/table',        label: 'Tables',               icon: IC['table2']        },
      { href: '/modal',        label: 'Modal',                icon: IC['layers']        },
      { href: '/toast',        label: 'Toast',                icon: IC['bell']          },
      { href: '/tooltip',      label: 'Tooltip',              icon: IC['messagesquare'] },
      { href: '/calendar',     label: 'Calendar',             icon: IC['calendardays']  },
    ],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    links: [
      { href: '/i18n',         label: 'Internationalization', icon: IC['languages']   },
      { href: '/admin',        label: 'Admin Panel',          icon: IC['shield']      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    links: [
      { href: '/benchmark',    label: 'Benchmark',            icon: IC['barchart2']   },
    ],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_PREFIX = 'lf-docs-sidebar-';
const LS_DESKTOP_COLLAPSED = 'lf-docs-sidebar-desktop-collapsed';

function loadCollapsed(id: string, defaultOpen: boolean): boolean {
  try {
    const v = localStorage.getItem(LS_PREFIX + id);
    if (v !== null) return v === 'true';
  } catch { /* ignore */ }
  return !defaultOpen;
}

function saveCollapsed(id: string, collapsed: boolean): void {
  try { localStorage.setItem(LS_PREFIX + id, String(collapsed)); } catch { /* ignore */ }
}

function loadDesktopCollapsed(): boolean {
  try { return localStorage.getItem(LS_DESKTOP_COLLAPSED) === 'true'; } catch { return false; }
}

function saveDesktopCollapsed(v: boolean): void {
  try { localStorage.setItem(LS_DESKTOP_COLLAPSED, String(v)); } catch { /* ignore */ }
}

// ─── Layout component ─────────────────────────────────────────────────────────

export const Layout = createComponent({
  name: 'DocsLayout',
  component() {
    const mobileOpen = signal(false);
    const toggleMobile = () => mobileOpen.update(v => !v);
    const closeMobile  = () => mobileOpen.set(false);

    // Desktop sidebar collapsed state (icon-only mode)
    const desktopCollapsed = signal(loadDesktopCollapsed());
    const toggleDesktop = () => {
      const next = !desktopCollapsed();
      desktopCollapsed.set(next);
      saveDesktopCollapsed(next);
    };

    // Per-section collapsed state
    const collapsed = new Map<string, ReturnType<typeof signal<boolean>>>();
    for (const g of NAV_GROUPS) {
      collapsed.set(g.id, signal(loadCollapsed(g.id, true)));
    }

    const toggle = (g: NavGroup) => {
      const sig = collapsed.get(g.id)!;
      const next = !sig();
      sig.set(next);
      saveCollapsed(g.id, next);
    };

    // ── Desktop sidebar (collapses to icon-rail) ──────────────────────────────
    const desktopSidebar = (
      <aside
        class={() => `hidden lg:flex flex-col shrink-0 border-r border-[var(--line-default)] bg-[--surface-raised] h-screen sticky top-0 overflow-hidden transition-[width] duration-200 ease-in-out ${desktopCollapsed() ? 'w-12' : 'w-56'}`}
      >
        {/* Header: logo + toggle */}
        <div class="flex items-center border-b border-[var(--line-default)] shrink-0" style="height:53px">

          {/* Toggle button — always visible at left */}
          <button
            type="button"
            onclick={toggleDesktop}
            class="flex items-center justify-center w-12 h-full shrink-0 text-[--content-muted] hover:text-[--content-primary] hover:bg-[--surface-overlay] transition-colors"
            title="Toggle sidebar"
          >
            {() => icon(desktopCollapsed() ? IC['panelright'] : IC['panelleft'], 'w-4 h-4')}
          </button>

          {/* Logo — hidden when collapsed */}
          <div class={() => `overflow-hidden transition-[opacity,max-width] duration-200 ${desktopCollapsed() ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            {Link({
              href: '/',
              children: (
                <span class="flex items-center gap-2 pr-4 whitespace-nowrap">
                  <span class="text-base font-bold text-[--content-primary] tracking-tight">LiteForge</span>
                  <span class="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-[--badge-indigo-bg] text-[--badge-indigo-text]">docs</span>
                </span>
              ),
            })}
          </div>
        </div>

        {/* Nav */}
        <nav class="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_GROUPS.map(group => {
            const collapsedSig = collapsed.get(group.id)!;

            return (
              <div class="mb-0.5">

                {/* Section header — hidden in desktop-collapsed mode */}
                <div class={() => `overflow-hidden transition-[max-height,opacity] duration-200 ${desktopCollapsed() ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
                  <button
                    type="button"
                    onclick={() => toggle(group)}
                    class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-widest text-[--content-muted] hover:text-[--content-secondary] hover:bg-[--surface-overlay] transition-colors cursor-pointer select-none"
                  >
                    <span>{group.label}</span>
                    <span class={() => `text-[--content-subtle] transition-opacity duration-200 ${collapsedSig() ? 'opacity-50' : 'opacity-100'}`}>
                      {() => icon(collapsedSig() ? IC['chevronright'] : IC['chevrondown'], 'w-3 h-3')}
                    </span>
                  </button>
                </div>

                {/* Link list */}
                <ul
                  class={() => `space-y-0.5 mt-0.5 overflow-hidden transition-all duration-200 ${
                    // In desktop-collapsed: always show all icons (ignore section collapse)
                    // In expanded: respect per-section collapse
                    desktopCollapsed()
                      ? 'max-h-[2000px] opacity-100'
                      : collapsedSig()
                        ? 'max-h-0 opacity-0'
                        : `max-h-[${group.links.length * 36}px] opacity-100`
                  }`}
                >
                  {group.links.map(link => {
                    const anchor = Link({
                      href: link.href,
                      activeClass: 'lf-nav-active',
                      class: 'lf-nav-link flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors',
                      children: (
                        <span class="flex items-center gap-2.5 min-w-0">
                          <span class="shrink-0 text-[--content-muted] flex items-center justify-center">
                            {icon(link.icon)}
                          </span>
                          <span class={() => `truncate leading-tight transition-[opacity,max-width] duration-200 ${desktopCollapsed() ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-xs opacity-100'}`}>
                            {link.label}
                          </span>
                        </span>
                      ),
                    });
                    // Tooltip shows label only in icon-only mode
                    tooltip(anchor, { content: link.label, position: 'right', delay: 200, showWhen: () => desktopCollapsed() });
                    return (
                      <li class={() => desktopCollapsed() ? 'lf-nav-collapsed-item' : ''}>
                        {anchor}
                      </li>
                    );
                  })}
                </ul>

              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div class="border-t border-[var(--line-default)] shrink-0 flex items-center" style="height:45px">
          <button
            type="button"
            onclick={() => themeStore.toggle()}
            class={() => `flex items-center transition-colors text-[var(--content-muted)] hover:text-[var(--content-primary)] ${desktopCollapsed() ? 'justify-center w-full h-full' : 'gap-2 px-4 text-xs'}`}
            title="Toggle light/dark"
          >
            {() => icon(themeStore.isDark() ? IC['sun'] : IC['moon'], 'w-3.5 h-3.5 shrink-0')}
            <span class={() => `whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200 text-xs ${desktopCollapsed() ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
              {() => themeStore.label()}
            </span>
          </button>
        </div>
      </aside>
    );

    // ── Mobile sidebar (always full-width, no icon-only mode) ─────────────────
    const mobileSidebar = (
      <aside class="flex flex-col w-56 shrink-0 border-r border-[var(--line-default)] bg-[--surface-raised] h-screen overflow-y-auto">

        <div class="flex items-center gap-2 px-4 py-4 border-b border-[var(--line-default)]">
          {Link({
            href: '/',
            children: (
              <span class="flex items-center gap-2">
                <span class="text-base font-bold text-[--content-primary] tracking-tight">LiteForge</span>
                <span class="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-[--badge-indigo-bg] text-[--badge-indigo-text]">docs</span>
              </span>
            ),
          })}
        </div>

        <nav class="flex-1 px-2 py-4 space-y-1">
          {NAV_GROUPS.map(group => {
            const collapsedSig = collapsed.get(group.id)!;
            return (
              <div class="mb-1">
                <button
                  type="button"
                  onclick={() => toggle(group)}
                  class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-widest text-[--content-muted] hover:text-[--content-secondary] hover:bg-[--surface-overlay] transition-colors cursor-pointer select-none"
                >
                  <span>{group.label}</span>
                  <span class={() => `text-[--content-subtle] transition-opacity duration-200 ${collapsedSig() ? 'opacity-50' : 'opacity-100'}`}>
                    {() => icon(collapsedSig() ? IC['chevronright'] : IC['chevrondown'], 'w-3 h-3')}
                  </span>
                </button>
                <ul
                  class="space-y-0.5 mt-0.5 overflow-hidden transition-all duration-200"
                  style={() => collapsedSig()
                    ? 'max-height:0;opacity:0'
                    : `max-height:${group.links.length * 36}px;opacity:1`}
                >
                  {group.links.map(link => {
                    const anchor = Link({
                      href: link.href,
                      activeClass: 'lf-nav-active',
                      class: 'lf-nav-link flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors',
                      children: (
                        <span class="flex items-center gap-2.5 min-w-0">
                          <span class="shrink-0 text-[--content-muted]">{icon(link.icon)}</span>
                          <span class="truncate leading-tight">{link.label}</span>
                        </span>
                      ),
                    });
                    return <li onclick={closeMobile}>{anchor}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div class="px-4 py-3 border-t border-[var(--line-default)] flex items-center justify-between">
          <span class="text-xs text-[var(--content-subtle)]">MIT License</span>
          <button
            type="button"
            onclick={() => themeStore.toggle()}
            class="flex items-center gap-1.5 text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] transition-colors"
          >
            {() => icon(themeStore.isDark() ? IC['sun'] : IC['moon'], 'w-3.5 h-3.5')}
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
          {mobileSidebar}
        </div>

        {/* Desktop sidebar */}
        {desktopSidebar}

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

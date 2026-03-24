import { createComponent, signal, effect, use } from 'liteforge';
import { RouterOutlet, Link } from '@liteforge/router';
import { tooltip } from '@liteforge/tooltip';
import { themeStore } from '../../stores/theme.js';
import { TableOfContents } from '../../components/TableOfContents.js';
import { tocEntries } from '../../toc.js';
import { icon, IC } from './icons.js';
import { NAV_GROUPS, loadCollapsed, saveCollapsed, loadDesktopCollapsed, saveDesktopCollapsed } from './nav.js';
import { TC_DEFAULTS, TC_SWATCHES, loadTC, saveTC, lighten } from './theme-customizer.js';

export const Layout = createComponent({
  name: 'DocsLayout',
  component() {
    const { t, locale, setLocale } = use('i18n');
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

    const toggle = (g: (typeof NAV_GROUPS)[number]) => {
      const sig = collapsed.get(g.id)!;
      const next = !sig();
      sig.set(next);
      saveCollapsed(g.id, next);
    };

    // ── Theme Customizer ──────────────────────────────────────────────────
    const tcSaved  = loadTC();
    const tcOpen   = signal(false);
    const tcAccent = signal<string>(tcSaved.accent);
    const tcRadius = signal<number>(tcSaved.radius);

    effect(() => {
      const accent = tcAccent();
      const radius = tcRadius();
      const root = document.documentElement.style;
      root.setProperty('--color-primary', accent);
      root.setProperty('--color-primary-light', lighten(accent, 20));
      root.setProperty('--lf-modal-border-radius', `${radius}px`);
      root.setProperty('--lf-tooltip-radius', `${radius}px`);
      root.setProperty('--lf-radius', `${radius}px`);
      saveTC({ accent, radius });
    });

    // paintbrush SVG (inline, no dependency on IC helper)
    const paintbrushIcon = (() => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z');
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7');
      const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path3.setAttribute('d', 'M14.5 17.5c4.2-2.5 6-6 5.3-10.3');
      svg.append(path1, path2, path3);
      return svg;
    })();

    const tcPanel = (
      <div class="lf-tc-panel">
        <header>
          <span class="lf-tc-title">{() => t('tc.title')}</span>
          <button
            type="button"
            onclick={() => tcOpen.set(false)}
            style="background:none;border:none;cursor:pointer;color:var(--content-muted);padding:2px 4px;font-size:14px;line-height:1;"
          >×</button>
        </header>

        <div class="lf-tc-section">
          <span class="lf-tc-label">{() => t('tc.accent')}</span>
          <div class="lf-tc-swatches">
            {TC_SWATCHES.map(s => (
              <button
                type="button"
                class={() => `lf-tc-swatch${tcAccent() === s.color ? ' active' : ''}`}
                style={`background:${s.color}`}
                title={s.label}
                onclick={() => tcAccent.set(s.color)}
              />
            ))}
          </div>
        </div>

        <div class="lf-tc-section">
          <span class="lf-tc-label">{() => t('tc.radius')}</span>
          <div class="lf-tc-row">
            <input
              type="range"
              class="lf-tc-slider"
              min="0"
              max="16"
              step="1"
              value={() => tcRadius()}
              oninput={(e: Event) => tcRadius.set(Number((e.target as HTMLInputElement).value))}
            />
            <span class="lf-tc-value">{() => `${tcRadius()}px`}</span>
          </div>
        </div>

        <button
          type="button"
          class="lf-tc-reset"
          onclick={() => { tcAccent.set(TC_DEFAULTS.accent); tcRadius.set(TC_DEFAULTS.radius); }}
        >{() => t('tc.reset')}</button>
      </div>
    );

    const tcButton = (() => {
      const btn = (
        <button
          type="button"
          class="lf-tc-toggle"
          style={() => `background:${tcAccent()}`}
          onclick={() => tcOpen.update(v => !v)}
        >
          {paintbrushIcon}
        </button>
      ) as HTMLButtonElement;
      return btn;
    })();

    // ── Desktop sidebar (collapses to icon-rail) ──────────────────────────────
    const desktopSidebar = (
      <aside
        class={() => `hidden lg:flex flex-col shrink-0 border-r border-[var(--line-default)] bg-[--surface-raised] h-screen sticky top-0 overflow-hidden transition-[width] duration-200 ease-in-out ${desktopCollapsed() ? 'w-12' : 'w-56'}`}
      >
        {/* Header: logo + toggle */}
        <div class="flex items-center border-b border-[var(--line-default)] shrink-0" style="height:53px">
          <button
            type="button"
            onclick={toggleDesktop}
            class="flex items-center justify-center w-12 h-full shrink-0 text-[--content-muted] hover:text-[--content-primary] hover:bg-[--surface-overlay] transition-colors"
            title="Toggle sidebar"
          >
            {() => icon(desktopCollapsed() ? IC['panelright']! : IC['panelleft']!, 'w-4 h-4')}
          </button>

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
        <nav class={() => `flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden ${desktopCollapsed() ? 'px-0' : 'px-1.5'}`}>
          {NAV_GROUPS.map(group => {
            const collapsedSig = collapsed.get(group.id)!;

            return (
              <div class="mb-0.5">
                <div class={() => `overflow-hidden transition-[max-height,opacity] duration-200 ${desktopCollapsed() ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
                  <button
                    type="button"
                    onclick={() => toggle(group)}
                    class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[0.65rem] font-semibold uppercase tracking-widest text-[--content-muted] hover:text-[--content-secondary] hover:bg-[--surface-overlay] transition-colors cursor-pointer select-none"
                  >
                    <span>{() => t(group.labelKey)}</span>
                    <span class={() => `text-[--content-subtle] transition-opacity duration-200 ${collapsedSig() ? 'opacity-50' : 'opacity-100'}`}>
                      {() => icon(collapsedSig() ? IC['chevronright']! : IC['chevrondown']!, 'w-3 h-3')}
                    </span>
                  </button>
                </div>

                <ul
                  class={() => `space-y-0.5 mt-0.5 overflow-hidden transition-all duration-200 ${
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
                            {() => t(link.labelKey)}
                          </span>
                        </span>
                      ),
                    });
                    tooltip(anchor, { content: t(link.labelKey), position: 'right', delay: 200, showWhen: () => desktopCollapsed() });
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
            class={() => `flex items-center justify-center transition-colors text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] rounded ${desktopCollapsed() ? 'w-full h-full' : 'w-9 h-9 ml-1'}`}
            title={() => t('footer.toggleTheme')}
          >
            {() => icon(themeStore.isDark() ? IC['sun']! : IC['moon']!, 'w-3.5 h-3.5 shrink-0')}
          </button>
          <div class={() => `overflow-hidden transition-[opacity,max-width] duration-200 ${desktopCollapsed() ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            <button
              type="button"
              onclick={() => void setLocale(locale() === 'de' ? 'en' : 'de')}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors whitespace-nowrap"
              title={() => t('footer.language')}
            >
              {() => icon(IC['languages']!, 'w-3.5 h-3.5 shrink-0')}
              <span>{() => locale() === 'de' ? 'DE' : 'EN'}</span>
            </button>
          </div>
        </div>
      </aside>
    );

    // ── Mobile sidebar ────────────────────────────────────────────────────────
    const mobileSidebar = (
      <aside class="flex flex-col w-56 shrink-0 border-r border-[var(--line-default)] bg-[var(--surface-raised)] h-screen overflow-y-auto">
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
                  <span>{() => t(group.labelKey)}</span>
                  <span class={() => `text-[--content-subtle] transition-opacity duration-200 ${collapsedSig() ? 'opacity-50' : 'opacity-100'}`}>
                    {() => icon(collapsedSig() ? IC['chevronright']! : IC['chevrondown']!, 'w-3 h-3')}
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
                          <span class="truncate leading-tight">{() => t(link.labelKey)}</span>
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
          <span class="text-xs text-[var(--content-subtle)]">{() => t('footer.license')}</span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              onclick={() => void setLocale(locale() === 'de' ? 'en' : 'de')}
              class="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
              title={() => t('footer.language')}
            >
              {() => icon(IC['languages']!, 'w-3.5 h-3.5 shrink-0')}
              <span>{() => locale() === 'de' ? 'DE' : 'EN'}</span>
            </button>
            <button
              type="button"
              onclick={() => themeStore.toggle()}
              class="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
              title={() => t('footer.toggleTheme')}
            >
              {() => icon(themeStore.isDark() ? IC['sun']! : IC['moon']!, 'w-3.5 h-3.5')}
            </button>
          </div>
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

          <main class="docs-main">
            <div class="docs-content">
              {RouterOutlet()}
            </div>
            {() => {
              const entries = tocEntries();
              if (entries.length === 0) return null;
              const col = document.createElement('div');
              col.className = 'docs-toc-col';
              col.appendChild(TableOfContents({ entries }));
              return col;
            }}
          </main>
        </div>

        {/* Theme Customizer — fixed bottom-right */}
        <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          <div style={() => tcOpen() ? '' : 'display:none'}>
            {tcPanel}
          </div>
          {tcButton}
        </div>

      </div>
    );
  },
});

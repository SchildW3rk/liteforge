import { createComponent, signal, effect, use } from 'liteforge';
import { RouterOutlet, Link } from 'liteforge/router';
import { tooltip } from 'liteforge/tooltip';
import { themeStore } from '../stores/theme.js';
import type { ExtractKeys } from 'liteforge/i18n';
import type { DocsTranslations } from '../locales/en.js';
import { TableOfContents } from '../components/TableOfContents.js';
import { tocEntries } from '../toc.js';

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

type DocKey = ExtractKeys<DocsTranslations>;

interface NavLink {
  href: string;
  labelKey: DocKey;
  icon: IconNode;
}

interface NavGroup {
  id: string;
  labelKey: DocKey;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'foundation',
    labelKey: 'nav.foundation',
    links: [
      { href: '/app',          labelKey: 'nav.app',         icon: IC['rocket']       },
      { href: '/core',         labelKey: 'nav.core',        icon: IC['zap']          },
      { href: '/runtime',      labelKey: 'nav.runtime',     icon: IC['box']          },
      { href: '/lifecycle',    labelKey: 'nav.lifecycle',   icon: IC['refreshcw']    },
      { href: '/store',        labelKey: 'nav.store',       icon: IC['database']     },
      { href: '/devtools',     labelKey: 'nav.devtools',    icon: IC['wrench']       },
    ],
  },
  {
    id: 'control-flow',
    labelKey: 'nav.controlFlow',
    links: [
      { href: '/control-flow', labelKey: 'nav.controlflow', icon: IC['gitbranch']   },
    ],
  },
  {
    id: 'routing',
    labelKey: 'nav.routing',
    links: [
      { href: '/router',       labelKey: 'nav.router',      icon: IC['navigation']  },
    ],
  },
  {
    id: 'data',
    labelKey: 'nav.data',
    links: [
      { href: '/query',        labelKey: 'nav.query',       icon: IC['clouddownload'] },
      { href: '/client',       labelKey: 'nav.client',      icon: IC['globe']         },
    ],
  },
  {
    id: 'ui',
    labelKey: 'nav.ui',
    links: [
      { href: '/form',         labelKey: 'nav.form',        icon: IC['clipboardlist'] },
      { href: '/table',        labelKey: 'nav.table',       icon: IC['table2']        },
      { href: '/modal',        labelKey: 'nav.modal',       icon: IC['layers']        },
      { href: '/toast',        labelKey: 'nav.toast',       icon: IC['bell']          },
      { href: '/tooltip',      labelKey: 'nav.tooltip',     icon: IC['messagesquare'] },
      { href: '/calendar',     labelKey: 'nav.calendar',    icon: IC['calendardays']  },
    ],
  },
  {
    id: 'plugins',
    labelKey: 'nav.plugins',
    links: [
      { href: '/i18n',         labelKey: 'nav.i18n',        icon: IC['languages']   },
      { href: '/admin',        labelKey: 'nav.admin',       icon: IC['shield']      },
    ],
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    links: [
      { href: '/benchmark',    labelKey: 'nav.benchmark',   icon: IC['barchart2']   },
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

// ─── Theme Customizer helpers ─────────────────────────────────────────────────

const TC_DEFAULTS = { accent: '#6366f1', radius: 6 };
const TC_LS_KEY   = 'lf-docs-theme-customizer';

interface TCState { accent: string; radius: number }

function loadTC(): TCState {
  try {
    const raw = localStorage.getItem(TC_LS_KEY);
    if (raw) return { ...TC_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...TC_DEFAULTS };
}

function saveTC(s: TCState): void {
  try { localStorage.setItem(TC_LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Convert a hex color to an HSL-lightened hex (pure, no deps). */
function lighten(hex: string, amount: number): string {
  // Parse #rrggbb or #rgb
  let r: number, g: number, b: number;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h.charAt(0) + h.charAt(0), 16);
    g = parseInt(h.charAt(1) + h.charAt(1), 16);
    b = parseInt(h.charAt(2) + h.charAt(2), 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  // RGB → HSL
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let hh = 0, ss = 0;
  if (d !== 0) {
    ss = d / (1 - Math.abs(2 * l - 1));
    if (max === rn)      hh = ((gn - bn) / d + 6) % 6;
    else if (max === gn) hh = (bn - rn) / d + 2;
    else                 hh = (rn - gn) / d + 4;
    hh /= 6;
  }
  // Bump lightness, clamp 0–1
  const l2 = Math.min(1, l + amount / 100);
  // HSL → RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1/6) return p + (q - p) * 6 * tt;
    if (tt < 1/2) return q;
    if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
    return p;
  };
  const q2 = l2 < 0.5 ? l2 * (1 + ss) : l2 + ss - l2 * ss;
  const p2 = 2 * l2 - q2;
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p2, q2, hh + 1/3))}${toHex(hue2rgb(p2, q2, hh))}${toHex(hue2rgb(p2, q2, hh - 1/3))}`;
}

const TC_SWATCHES = [
  { color: '#6366f1', label: 'Indigo'   },
  { color: '#8b5cf6', label: 'Violet'   },
  { color: '#3b82f6', label: 'Blue'     },
  { color: '#10b981', label: 'Emerald'  },
  { color: '#f59e0b', label: 'Amber'    },
  { color: '#ef4444', label: 'Red'      },
  { color: '#ec4899', label: 'Pink'     },
  { color: '#14b8a6', label: 'Teal'     },
];

// ─── Layout component ─────────────────────────────────────────────────────────

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

    const toggle = (g: NavGroup) => {
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
            {TC_SWATCHES.map(s => {
              const btn = (
                <button
                  type="button"
                  class={() => `lf-tc-swatch${tcAccent() === s.color ? ' active' : ''}`}
                  style={`background:${s.color}`}
                  title={s.label}
                  onclick={() => tcAccent.set(s.color)}
                />
              );
              return btn;
            })}
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
        <nav class={() => `flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden ${desktopCollapsed() ? 'px-0' : 'px-1.5'}`}>
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
                    <span>{() => t(group.labelKey)}</span>
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
                            {() => t(link.labelKey)}
                          </span>
                        </span>
                      ),
                    });
                    // Tooltip shows label only in icon-only mode
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
            {() => icon(themeStore.isDark() ? IC['sun'] : IC['moon'], 'w-3.5 h-3.5 shrink-0')}
          </button>
          {/* Locale toggle — hidden when icon-only */}
          <div class={() => `overflow-hidden transition-[opacity,max-width] duration-200 ${desktopCollapsed() ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'}`}>
            <button
              type="button"
              onclick={() => void setLocale(locale() === 'de' ? 'en' : 'de')}
              class="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors whitespace-nowrap"
              title={() => t('footer.language')}
            >
              {() => icon(IC['languages'], 'w-3.5 h-3.5 shrink-0')}
              <span>{() => locale() === 'de' ? 'DE' : 'EN'}</span>
            </button>
          </div>
        </div>
      </aside>
    );

    // ── Mobile sidebar (always full-width, no icon-only mode) ─────────────────
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
              {() => icon(IC['languages'], 'w-3.5 h-3.5 shrink-0')}
              <span>{() => locale() === 'de' ? 'DE' : 'EN'}</span>
            </button>
            <button
              type="button"
              onclick={() => themeStore.toggle()}
              class="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-overlay)] transition-colors"
              title={() => t('footer.toggleTheme')}
            >
              {() => icon(themeStore.isDark() ? IC['sun'] : IC['moon'], 'w-3.5 h-3.5')}
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

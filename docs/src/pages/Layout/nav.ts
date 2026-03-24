import type { ExtractKeys } from '@liteforge/i18n';
import type { DocsTranslations } from '../../locales/en.js';
import type { IconNode } from './icons.js';
import { IC } from './icons.js';

type DocKey = ExtractKeys<DocsTranslations>;

export interface NavLink {
  href: string;
  labelKey: DocKey;
  icon: IconNode;
}

export interface NavGroup {
  id: string;
  labelKey: DocKey;
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'foundation',
    labelKey: 'nav.foundation',
    links: [
      { href: '/app',          labelKey: 'nav.app',         icon: IC['rocket']!       },
      { href: '/core',         labelKey: 'nav.core',        icon: IC['zap']!          },
      { href: '/runtime',      labelKey: 'nav.runtime',     icon: IC['box']!          },
      { href: '/lifecycle',    labelKey: 'nav.lifecycle',   icon: IC['refreshcw']!    },
      { href: '/store',        labelKey: 'nav.store',       icon: IC['database']!     },
      { href: '/devtools',     labelKey: 'nav.devtools',    icon: IC['wrench']!       },
    ],
  },
  {
    id: 'control-flow',
    labelKey: 'nav.controlFlow',
    links: [
      { href: '/control-flow', labelKey: 'nav.controlflow', icon: IC['gitbranch']!   },
    ],
  },
  {
    id: 'routing',
    labelKey: 'nav.routing',
    links: [
      { href: '/router',       labelKey: 'nav.router',      icon: IC['navigation']!  },
    ],
  },
  {
    id: 'data',
    labelKey: 'nav.data',
    links: [
      { href: '/query',        labelKey: 'nav.query',       icon: IC['clouddownload']! },
      { href: '/client',       labelKey: 'nav.client',      icon: IC['globe']!         },
    ],
  },
  {
    id: 'ui',
    labelKey: 'nav.ui',
    links: [
      { href: '/form',         labelKey: 'nav.form',        icon: IC['clipboardlist']! },
      { href: '/table',        labelKey: 'nav.table',       icon: IC['table2']!        },
      { href: '/modal',        labelKey: 'nav.modal',       icon: IC['layers']!        },
      { href: '/toast',        labelKey: 'nav.toast',       icon: IC['bell']!          },
      { href: '/tooltip',      labelKey: 'nav.tooltip',     icon: IC['messagesquare']! },
      { href: '/calendar',     labelKey: 'nav.calendar',    icon: IC['calendardays']!  },
    ],
  },
  {
    id: 'plugins',
    labelKey: 'nav.plugins',
    links: [
      { href: '/i18n',         labelKey: 'nav.i18n',        icon: IC['languages']!   },
      { href: '/admin',        labelKey: 'nav.admin',       icon: IC['shield']!      },
    ],
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    links: [
      { href: '/benchmark',    labelKey: 'nav.benchmark',   icon: IC['barchart2']!   },
    ],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_PREFIX = 'lf-docs-sidebar-';
export const LS_DESKTOP_COLLAPSED = 'lf-docs-sidebar-desktop-collapsed';

export function loadCollapsed(id: string, defaultOpen: boolean): boolean {
  try {
    const v = localStorage.getItem(LS_PREFIX + id);
    if (v !== null) return v === 'true';
  } catch { /* ignore */ }
  return !defaultOpen;
}

export function saveCollapsed(id: string, collapsed: boolean): void {
  try { localStorage.setItem(LS_PREFIX + id, String(collapsed)); } catch { /* ignore */ }
}

export function loadDesktopCollapsed(): boolean {
  try { return localStorage.getItem(LS_DESKTOP_COLLAPSED) === 'true'; } catch { return false; }
}

export function saveDesktopCollapsed(v: boolean): void {
  try { localStorage.setItem(LS_DESKTOP_COLLAPSED, String(v)); } catch { /* ignore */ }
}

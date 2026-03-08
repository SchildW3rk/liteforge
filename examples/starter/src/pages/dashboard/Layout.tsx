/**
 * Dashboard Layout
 *
 * Sidebar with icon+label navigation, collapses to icon-only with tooltips.
 */

import { createComponent } from 'liteforge';
import { RouterOutlet } from 'liteforge/router';
import { tooltip } from 'liteforge/tooltip';
import { authStore } from '../../stores/auth.js';
import { uiStore } from '../../stores/ui.js';
import type { Router } from 'liteforge/router';

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Home',        icon: '⊞',  exact: true  },
  { href: '/dashboard/users',    label: 'Users',       icon: '👥'               },
  { href: '/dashboard/posts',    label: 'Posts',       icon: '📝'               },
  { href: '/dashboard/settings', label: 'Settings',    icon: '⚙️'               },
  { href: '/dashboard/forms',    label: 'Forms',       icon: '📋'               },
  { href: '/dashboard/tables',   label: 'Tables',      icon: '📊'               },
  { href: '/dashboard/calendar', label: 'Calendar',    icon: '📅'               },
  { href: '/dashboard/modals',   label: 'Modals',      icon: '🪟'               },
  { href: '/dashboard/client',   label: 'Client',      icon: '🔌'               },
  { href: '/dashboard/i18n',     label: 'i18n',        icon: '🌍'               },
  { href: '/dashboard/toasts',   label: 'Toasts',      icon: '🔔'               },
  { href: '/lf-admin',           label: 'LF Admin',    icon: '🛡️'               },
];

// =============================================================================
// Component
// =============================================================================

export const DashboardLayout = createComponent({
  name: 'DashboardLayout',
  component({ use }) {
    const router = use<Router>('router');

    const handleLogout = async () => {
      await authStore.logout();
      router.navigate('/');
    };

    const navLinks = NAV_ITEMS.map(item =>
      <a
        href={item.href}
        class="nav-item"
        ref={(el: HTMLElement) => tooltip(el, {
          content: item.label,
          position: 'right',
          delay: 150,
          showWhen: () => !uiStore.sidebarOpen(),
        })}
        onclick={(e: Event) => {
          e.preventDefault();
          router.navigate(item.href);
        }}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-label">{item.label}</span>
      </a>
    );

    return (
      <div class={() => `dashboard-layout${uiStore.sidebarOpen() ? '' : ' sidebar-collapsed'}`}>

        {/* ── Sidebar ── */}
        <aside class="sidebar">

          {/* Logo / brand row */}
          <div class="sidebar-brand">
            <span class="sidebar-brand-icon">⚡</span>
            <span class="sidebar-brand-name">Dashboard</span>
          </div>

          {/* Toggle button */}
          <button type="button" class="sidebar-toggle" onclick={() => uiStore.toggleSidebar()}>
            <span class="sidebar-toggle-icon">{() => uiStore.sidebarOpen() ? '«' : '»'}</span>
          </button>

          {/* Nav */}
          <nav class="sidebar-nav">
            {navLinks}
          </nav>

          {/* Footer */}
          <div class="sidebar-footer">
            <div
              class="nav-item sidebar-user"
              ref={(el: HTMLElement) => tooltip(el, {
                content: authStore.displayName(),
                position: 'right',
                delay: 150,
                showWhen: () => !uiStore.sidebarOpen(),
              })}
            >
              <span class="nav-icon">👤</span>
              <span class="nav-label">{() => authStore.displayName()}</span>
            </div>
            <button
              type="button"
              class="nav-item sidebar-logout"
              ref={(el: HTMLElement) => tooltip(el, {
                content: 'Logout',
                position: 'right',
                delay: 150,
                showWhen: () => !uiStore.sidebarOpen(),
              })}
              onclick={handleLogout}
            >
              <span class="nav-icon">🚪</span>
              <span class="nav-label">Logout</span>
            </button>
          </div>

        </aside>

        {/* ── Main content ── */}
        <main class="main-content">
          {RouterOutlet()}
        </main>

      </div>
    );
  },
});

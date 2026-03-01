/**
 * Dashboard Layout
 * 
 * Nested route layout with sidebar navigation.
 * 
 * Demonstrates:
 * - Nested RouterOutlet for child routes
 * - Link with activeClass for navigation highlighting
 * - Store integration for user display
 * - Sidebar toggle
 */

import { createComponent, Show } from '@liteforge/runtime';
import { Link, RouterOutlet } from '@liteforge/router';
import { authStore } from '../../stores/auth.js';
import { uiStore } from '../../stores/ui.js';
import type { Router } from '@liteforge/router';

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

    return (
      <div class={() => `dashboard-layout ${uiStore.sidebarOpen() ? '' : 'sidebar-collapsed'}`}>
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2>Dashboard</h2>
            <button type="button" class="toggle-btn" onClick={() => uiStore.toggleSidebar()}>
              {() => uiStore.sidebarOpen() ? '<<' : '>>'}
            </button>
          </div>
          
          <nav class="sidebar-nav">
            {Link({
              href: '/dashboard',
              children: 'Home',
              activeClass: 'active',
              exact: true,
            })}
            {Link({
              href: '/dashboard/users',
              children: 'Users',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard/posts',
              children: 'Posts',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard/settings',
              children: 'Settings',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard/forms',
              children: 'Forms',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard/tables',
              children: 'Tables',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard/calendar',
              children: 'Calendar',
              activeClass: 'active',
            })}
            {Show({
              when: () => authStore.isAdmin(),
              children: () => Link({
                href: '/admin',
                children: 'Admin Panel',
                activeClass: 'active',
                class: 'admin-link',
              }),
            })}
          </nav>
          
          <div class="sidebar-footer">
            <span>{() => authStore.displayName()}</span>
            <button type="button" class="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </aside>
        
        <main class="main-content">
          {RouterOutlet()}
        </main>
      </div>
    );
  },
});

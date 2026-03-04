/**
 * Admin Layout
 * 
 * Layout for admin-only routes.
 * 
 * Demonstrates:
 * - Nested RouterOutlet at different depth
 * - Protected admin navigation
 */

import { createComponent } from 'liteforge';
import { Link, RouterOutlet } from 'liteforge/router';

// =============================================================================
// Component
// =============================================================================

export const AdminLayout = createComponent({
  name: 'AdminLayout',
  component() {
    return (
      <div class="admin-layout">
        <header class="admin-header">
          <h1>Admin Panel</h1>
          <nav class="admin-nav">
            {Link({
              href: '/admin',
              children: 'Dashboard',
              activeClass: 'active',
              exact: true,
            })}
            {Link({
              href: '/admin/users',
              children: 'Manage Users',
              activeClass: 'active',
            })}
            {Link({
              href: '/dashboard',
              children: 'Back to Dashboard',
              class: 'back-link',
            })}
          </nav>
        </header>
        
        <main class="admin-content">
          {RouterOutlet()}
        </main>
      </div>
    );
  },
});

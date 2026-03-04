/**
 * App Root Component
 * 
 * Main application shell with header and RouterOutlet.
 * 
 * Demonstrates:
 * - Root level RouterOutlet
 * - Global header with navigation
 * - Notification display with For
 */

import { createComponent, Show, For } from 'liteforge';
import { Link, RouterOutlet } from 'liteforge/router';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';

// =============================================================================
// Component
// =============================================================================

export const App = createComponent({
  name: 'App',
  component() {
    return (
      <div class="app">
        <header class="app-header">
          {Link({
            href: '/',
            children: 'LiteForge',
            class: 'logo',
          })}
          <nav class="main-nav">
            {Link({
              href: '/',
              children: 'Home',
              activeClass: 'active',
              exactActiveClass: 'exact',
            })}
            {Show({
              when: () => authStore.isAuthenticated(),
              fallback: () => Link({
                href: '/login',
                children: 'Login',
                activeClass: 'active',
              }),
              children: () => Link({
                href: '/dashboard',
                children: 'Dashboard',
                activeClass: 'active',
              }),
            })}
          </nav>
        </header>
        
        <div class="app-content">
          {RouterOutlet()}
        </div>
        
        <div class="notifications">
          {For({
            each: () => uiStore.sortedNotifications(),
            key: 'id',
            children: (notification) => (
              <div class={`notification ${notification.type}`}>
                <span>{notification.message}</span>
                <button 
                  type="button"
                  class="dismiss-btn"
                  onClick={() => uiStore.dismissNotification(notification.id)}
                >
                  x
                </button>
              </div>
            ),
          })}
        </div>
      </div>
    );
  },
});

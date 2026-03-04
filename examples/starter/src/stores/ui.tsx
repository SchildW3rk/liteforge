/**
 * UI Store - Manages UI state like theme, sidebar, notifications
 * 
 * Demonstrates:
 * - Simple synchronous state management
 * - Derived state via getters
 * - Persistent preferences
 * - NO singleton wrapper needed - defineStore handles it!
 */

import { defineStore } from 'liteforge/store';
import { hasTitleOverride } from 'liteforge/router';

// =============================================================================
// Types
// =============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// =============================================================================
// Store - Direct export, no wrapper needed!
// =============================================================================

export const uiStore = defineStore('ui', {
  state: {
    theme: 'system' as Theme,
    sidebarOpen: true,
    notifications: [] as Notification[],
    pageTitle: 'LiteForge Demo',
  },

  getters: (state) => ({
    /** Get the effective theme (resolves 'system' to actual theme) */
    effectiveTheme: (): 'light' | 'dark' => {
      // state.theme() is correctly typed as Theme, no cast needed!
      const theme = state.theme();
      if (theme === 'light' || theme === 'dark') return theme;
      
      // Check system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    },

    /** Count of unread notifications */
    notificationCount: () => state.notifications().length,

    /** Get notifications sorted by timestamp (newest first) */
    sortedNotifications: () => 
      [...state.notifications()].sort((a, b) => b.timestamp - a.timestamp),

    /** Check if sidebar is collapsed */
    isSidebarCollapsed: () => !state.sidebarOpen(),
  }),

  actions: (state) => {
    // Helper function for applying theme
    const applyTheme = () => {
      const theme = state.theme();
      const effective = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      
      document.documentElement.setAttribute('data-theme', effective);
    };

    return {
      /**
       * Set the theme preference
       */
      setTheme(theme: Theme) {
        state.theme.set(theme);
        localStorage.setItem('liteforge_theme', theme);
        
        // Apply theme to document
        applyTheme();
        console.log('[UIStore] Theme set to:', theme);
      },

      /**
       * Apply the current theme to the document
       */
      applyTheme,

      /**
       * Toggle the sidebar open/closed
       */
      toggleSidebar() {
        state.sidebarOpen.update(open => !open);
        console.log('[UIStore] Sidebar toggled:', state.sidebarOpen() ? 'open' : 'closed');
      },

      /**
       * Set the page title
       */
      setPageTitle(title: string) {
        state.pageTitle.set(title);
        // Don't overwrite document.title when a component has claimed it via useTitle()
        if (!hasTitleOverride()) {
          document.title = `${title} | LiteForge Demo`;
        }
      },

      /**
       * Add a notification
       */
      notify(type: Notification['type'], message: string) {
        const notification: Notification = {
          id: crypto.randomUUID(),
          type,
          message,
          timestamp: Date.now(),
        };
        
        state.notifications.update(list => [...list, notification]);
        console.log(`[UIStore] Notification (${type}):`, message);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          state.notifications.update(list => list.filter(n => n.id !== notification.id));
        }, 5000);

        return notification.id;
      },

      /**
       * Dismiss a notification by ID
       */
      dismissNotification(id: string) {
        state.notifications.update(list => list.filter(n => n.id !== id));
      },

      /**
       * Clear all notifications
       */
      clearNotifications() {
        state.notifications.set([]);
      },

      /**
       * Initialize UI state from localStorage
       */
      initialize() {
        const storedTheme = localStorage.getItem('liteforge_theme') as Theme | null;
        if (storedTheme) {
          state.theme.set(storedTheme);
        }
        applyTheme();
        
        // Listen for system theme changes
        if (window.matchMedia) {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.theme() === 'system') {
              applyTheme();
            }
          });
        }
      },
    };
  },
});

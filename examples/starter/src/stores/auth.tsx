/**
 * Auth Store - Manages user authentication state
 * 
 * Demonstrates:
 * - defineStore with state, getters, and actions
 * - Async actions with loading/error states
 * - Integration with router guards
 * - NO singleton wrapper needed - defineStore handles it!
 */

import { defineStore } from 'liteforge/store';

// =============================================================================
// Types
// =============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
}

// =============================================================================
// Mock API
// =============================================================================

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user database
const mockUsers: Record<string, { password: string; user: User }> = {
  'admin@example.com': {
    password: 'admin',
    user: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  'user@example.com': {
    password: 'user',
    user: {
      id: '2',
      name: 'Regular User',
      email: 'user@example.com',
      role: 'user',
    },
  },
};

// =============================================================================
// Store - Direct export, no wrapper needed!
// =============================================================================

export const authStore = defineStore('auth', {
  state: {
    currentUser: null as User | null,
    loading: false,
    error: null as string | null,
    initialized: false,
  },

  getters: (state) => ({
    /** Check if user is authenticated */
    isAuthenticated: () => state.currentUser() !== null,

    /** Check if user is an admin */
    isAdmin: () => state.currentUser()?.role === 'admin',

    /** Get user's display name */
    displayName: () => state.currentUser()?.name ?? 'Guest',

    /** Check if user has a specific role */
    hasRole: (role: 'user' | 'admin') => {
      const user = state.currentUser();
      if (!user) return false;
      // Admin has all roles
      if (user.role === 'admin') return true;
      return user.role === role;
    },
  }),

  actions: (state) => ({
    /**
     * Initialize auth state (check for existing session)
     */
    async initialize() {
      if (state.initialized()) return;

      state.loading.set(true);
      state.error.set(null);

      try {
        await delay(500);
        
        // Check for stored session (in real app, would verify with server)
        const stored = localStorage.getItem('liteforge_user');
        if (stored) {
          const user = JSON.parse(stored) as User;
          state.currentUser.set(user);
          console.log('[AuthStore] Restored session for:', user.email);
        }
      } catch (e) {
        console.error('[AuthStore] Failed to initialize:', e);
      } finally {
        state.loading.set(false);
        state.initialized.set(true);
      }
    },

    /**
     * Log in with email and password
     */
    async login(email: string, password: string) {
      state.loading.set(true);
      state.error.set(null);

      try {
        await delay(800); // Simulate network delay

        const record = mockUsers[email];
        if (!record || record.password !== password) {
          throw new Error('Invalid email or password');
        }

        state.currentUser.set(record.user);
        localStorage.setItem('liteforge_user', JSON.stringify(record.user));
        
        console.log('[AuthStore] Login successful:', record.user.email);
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Login failed';
        state.error.set(message);
        console.error('[AuthStore] Login failed:', message);
        return false;
      } finally {
        state.loading.set(false);
      }
    },

    /**
     * Log out the current user
     */
    async logout() {
      state.loading.set(true);

      try {
        await delay(300);
        
        const user = state.currentUser();
        state.currentUser.set(null);
        localStorage.removeItem('liteforge_user');
        
        console.log('[AuthStore] Logout successful:', user?.email);
      } finally {
        state.loading.set(false);
      }
    },

    /**
     * Clear any auth errors
     */
    clearError() {
      state.error.set(null);
    },
  }),
});

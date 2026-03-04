/**
 * Settings Page
 * 
 * User preferences and app settings.
 * 
 * Demonstrates:
 * - Two-way binding with signals
 * - UI store integration (theme switching)
 * - Reactive UI updates
 */

import { createComponent, For } from 'liteforge';
import { uiStore, type Theme } from '../../stores/ui.js';
import { authStore } from '../../stores/auth.js';

// =============================================================================
// Component
// =============================================================================

export const SettingsPage = createComponent({
  name: 'SettingsPage',
  component() {
    const themes: Theme[] = ['light', 'dark', 'system'];

    return (
      <div class="settings-page">
        <header class="page-header">
          <h1>Settings</h1>
          <p>Customize your experience</p>
        </header>
        
        <section class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item">
            <span class="setting-label">Theme</span>
            <div class="theme-options">
              {For({
                each: () => themes,
                children: (theme) => (
                  <button 
                    type="button"
                    class={() => `theme-btn ${uiStore.theme() === theme ? 'active' : ''}`}
                    onClick={() => uiStore.setTheme(theme)}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ),
              })}
            </div>
          </div>
          <div class="setting-item">
            <span class="setting-label">Effective Theme</span>
            <span>{() => uiStore.effectiveTheme()}</span>
          </div>
        </section>
        
        <section class="settings-section">
          <h2>Account</h2>
          <div class="setting-item">
            <span class="setting-label">Email</span>
            <span>{() => authStore.currentUser()?.email ?? 'Not logged in'}</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Role</span>
            <span class={() => `badge ${authStore.currentUser()?.role ?? 'guest'}`}>
              {() => authStore.currentUser()?.role ?? 'guest'}
            </span>
          </div>
        </section>
        
        <section class="settings-section">
          <h2>Debug Info</h2>
          <p class="debug-hint">Open browser console to see store state and logs</p>
          <button 
            type="button"
            class="btn"
            onClick={async () => {
              const { storeRegistry } = await import('liteforge/store');
              console.log('='.repeat(50));
              console.log('[Store Registry] Current State:');
              console.log('Stores:', storeRegistry.list());
              console.log('Snapshot:', storeRegistry.snapshot());
              console.log('='.repeat(50));
            }}
          >
            Log Store State to Console
          </button>
        </section>
      </div>
    );
  },
});

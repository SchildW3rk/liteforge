/**
 * Login Page
 * 
 * Authentication form with error handling.
 * 
 * Demonstrates:
 * - Form handling with signals
 * - Store actions (login)
 * - Show for conditional error display
 * - Router navigation after login
 */

import { signal } from 'liteforge';
import { createComponent, Show, use } from 'liteforge';
import { authStore } from '../stores/auth.js';
import type { Router } from 'liteforge/router';

// =============================================================================
// Component
// =============================================================================

export const LoginPage = createComponent({
  name: 'LoginPage',
  setup() {
    const email = signal('');
    const password = signal('');
    
    return { email, password };
  },

  component({ setup }) {
    const { email, password } = setup;
    const router = use<Router>('router');

    // Get redirect URL from query params
    const redirectUrl = router.query().redirect ?? '/dashboard';

    // Handle form submission
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      authStore.clearError();
      
      const success = await authStore.login(email(), password());
      if (success) {
        router.navigate(redirectUrl as string);
      }
    };

    return (
      <div class="page login-page">
        <div class="login-card">
          <h1>Sign In</h1>
          
          {Show({
            when: () => authStore.error(),
            children: (errorMessage) => (
              <div class="error-message">{errorMessage}</div>
            ),
          })}
          
          <form onSubmit={handleSubmit}>
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email"
                placeholder="admin@example.com"
                onInput={(e: Event) => email.set((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password"
                placeholder="admin"
                onInput={(e: Event) => password.set((e.target as HTMLInputElement).value)}
              />
            </div>
            <button type="submit" disabled={() => authStore.loading()}>
              {() => authStore.loading() ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <p class="hint">
            Demo accounts: admin@example.com / admin, user@example.com / user
          </p>
        </div>
      </div>
    );
  },
});

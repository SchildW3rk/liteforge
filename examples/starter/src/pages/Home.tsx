/**
 * Home Page
 * 
 * Public landing page with navigation to login/dashboard.
 * 
 * Demonstrates:
 * - Basic component with createComponent
 * - Link navigation
 * - Conditional rendering with Show
 * - Reading from auth store
 */

import { createComponent, Show } from 'liteforge';
import { Link } from 'liteforge/router';
import { authStore } from '../stores/auth.js';

// =============================================================================
// Component
// =============================================================================

export const HomePage = createComponent({
  name: 'HomePage',
  component() {
    return (
      <div class="page home-page">
        <header class="hero">
          <h1>Welcome to LiteForge</h1>
          <p>A modern, lightweight frontend framework</p>
        </header>
        
        <section class="features">
          <div class="feature">
            <h3>Signals-based Reactivity</h3>
            <p>Fine-grained updates without Virtual DOM</p>
          </div>
          <div class="feature">
            <h3>Zero-Flicker Loading</h3>
            <p>Async data loads before component renders</p>
          </div>
          <div class="feature">
            <h3>Built-in Router</h3>
            <p>Guards, middleware, nested routes</p>
          </div>
        </section>
        
        <nav class="cta">
          {Show({
            when: () => authStore.isAuthenticated(),
            fallback: () => Link({ 
              href: '/login', 
              children: 'Get Started',
              class: 'btn btn-primary',
            }),
            children: () => Link({ 
              href: '/dashboard', 
              children: 'Go to Dashboard',
              class: 'btn btn-primary',
            }),
          })}
        </nav>
      </div>
    );
  },
});

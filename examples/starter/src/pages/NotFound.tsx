/**
 * Not Found Page (404)
 * 
 * Catch-all for unmatched routes.
 * 
 * Demonstrates:
 * - Catch-all route component
 * - Router navigation programmatically
 */

import { createComponent, use } from 'liteforge';
import { Link } from 'liteforge/router';
import type { Router } from 'liteforge/router';

// =============================================================================
// Component
// =============================================================================

export const NotFoundPage = createComponent({
  name: 'NotFoundPage',
  component() {
    const router = use<Router>('router');
    const currentPath = router.path();

    return (
      <div class="page not-found-page">
        <div class="content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page "{currentPath}" doesn't exist.</p>
          <nav class="actions">
            <button type="button" class="btn" onClick={() => router.back()}>Go Back</button>
            {Link({
              href: '/',
              children: 'Go Home',
              class: 'btn btn-primary',
            })}
          </nav>
        </div>
      </div>
    );
  },
});

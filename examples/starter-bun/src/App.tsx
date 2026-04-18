/**
 * App Root Component
 *
 * Main application shell with header and RouterOutlet.
 */

import { defineComponent } from 'liteforge';
import { RouterOutlet } from '@liteforge/router';
// =============================================================================
// Component
// =============================================================================

export const App = defineComponent({
  name: 'App',
  component() {
      return (
          <RouterOutlet />
      );
  },
});

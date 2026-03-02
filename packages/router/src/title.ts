import { signal, effect } from '@liteforge/core';
import type { Router } from './types.js';
import { getActiveRouter } from './router.js';

// Module-level signal — shared between setupTitleEffect and useTitle
const titleOverride = signal<(() => string) | null>(null);

/**
 * Called by createRouter when titleTemplate is provided.
 * Returns a dispose function for cleanup.
 */
export function setupTitleEffect(
  template: (title: string | undefined) => string,
  router: Router
): () => void {
  return effect(() => {
    const override = titleOverride();
    const matched = router.matched();
    const leaf = matched[matched.length - 1];
    const metaTitle = leaf?.route.meta?.['title'] as string | undefined;

    const rawTitle = override !== null ? override() : metaTitle;
    document.title = template(rawTitle);
  });
}

/**
 * Override document.title reactively from within a component.
 * Cleanup happens automatically on the next route navigation.
 */
export function useTitle(title: string | (() => string)): void {
  const getter = typeof title === 'string' ? () => title : title;
  titleOverride.set(getter);

  const router = getActiveRouter();
  const removeHook = router.afterEach(() => {
    // Only clear if this component's override is still active
    // (prevents race: new page may have called useTitle() before old page navigates away)
    if (titleOverride() === getter) {
      titleOverride.set(null);
    }
    removeHook(); // one-shot: remove after first navigation
  });
}

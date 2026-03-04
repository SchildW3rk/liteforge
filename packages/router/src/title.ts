import { signal, effect } from '@liteforge/core';
import { use, hasContext, onSetupCleanup } from '@liteforge/runtime';
import type { Router } from './types.js';
import { getActiveRouterOrNull } from './router.js';

// Module-level signal — shared between setupTitleEffect and useTitle
const titleOverride = signal<(() => string) | null>(null);

// True when a titleTemplate effect is active — useTitle defers to it
let titleTemplateActive = false;

/** Returns true if useTitle() has set an active override. */
export function hasTitleOverride(): boolean {
  return titleOverride() !== null;
}

/**
 * Called by createRouter when titleTemplate is provided.
 * Returns a dispose function for cleanup.
 */
export function setupTitleEffect(
  template: (title: string | undefined) => string,
  router: Router
): () => void {
  titleTemplateActive = true;
  const stop = effect(() => {
    const override = titleOverride();
    const matched = router.matched();
    const leaf = matched[matched.length - 1];
    const metaTitle = leaf?.route.meta?.['title'] as string | undefined;

    const rawTitle = override !== null ? override() : metaTitle;
    document.title = template(rawTitle);
  });
  return () => {
    titleTemplateActive = false;
    stop();
  };
}

/**
 * Override document.title reactively from within a component.
 * Reverts to the route's meta.title (or clears) when the component is destroyed
 * or when the next navigation fires — whichever comes first.
 */
export function useTitle(title: string | (() => string)): void {
  const getter = typeof title === 'string' ? () => title : title;
  titleOverride.set(getter);

  const routerOrNull = (hasContext('router') ? use<Router>('router') : null) ?? getActiveRouterOrNull();
  if (!routerOrNull) throw new Error('[useTitle] No router found. Make sure routerPlugin is installed.');
  const router: Router = routerOrNull;

  // When no titleTemplate is configured, manage document.title directly via effect
  // so it stays reactive if a getter function is passed.
  let stopEffect: (() => void) | undefined;
  if (!titleTemplateActive) {
    document.title = getter();
    stopEffect = effect(() => {
      const override = titleOverride();
      if (override !== null) {
        document.title = override();
      }
    });
  }

  function cleanup() {
    stopEffect?.();
    stopEffect = undefined;
    if (titleOverride() === getter) {
      titleOverride.set(null);
      // Restore route meta.title when no titleTemplate is active
      if (!titleTemplateActive) {
        const matched = router.matched();
        const leaf = matched[matched.length - 1];
        const metaTitle = leaf?.route.meta?.['title'] as string | undefined;
        if (metaTitle) document.title = metaTitle;
      }
    }
    removeHook();
  }

  // One-shot navigation hook — cleans up after leaving this route
  const removeHook = router.afterEach(cleanup);

  // Also clean up when the component is destroyed (HMR, conditional rendering, etc.)
  onSetupCleanup(cleanup);
}

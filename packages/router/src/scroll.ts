import type { Location } from './types.js';

// =============================================================================
// Scroll Behavior Types
// =============================================================================

/**
 * Scroll behavior configuration for the router.
 *
 * - `'top'`  — scroll to top on push/replace, scroll to anchor if hash present.
 *              On pop (back/forward) restores the saved scroll position.
 * - `'none'` — no automatic scrolling; the app manages scroll manually.
 * - `(to, from) => void` — custom function called after every navigation.
 */
export type ScrollBehavior =
  | 'top'
  | 'none'
  | ((to: Location, from: Location | null) => void);

// =============================================================================
// Scroll Handler
// =============================================================================

/**
 * Scroll positions saved per history entry key.
 * Key: string obtained from window.history.state?.__scrollKey or path.
 */
const scrollPositions = new Map<string, { x: number; y: number }>();

/**
 * Scroll to the element matching `hash` after a short delay so that lazy-loaded
 * content has a chance to be inserted into the DOM.
 */
function scrollToHash(hash: string): void {
  setTimeout(() => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Element not found yet — try once more after the next frame
      requestAnimationFrame(() => {
        const el2 = document.getElementById(hash);
        if (el2) {
          el2.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }, 0);
}

/**
 * Save the current scroll position for the given key.
 */
export function saveScrollPosition(key: string): void {
  scrollPositions.set(key, { x: window.scrollX, y: window.scrollY });
}

/**
 * Get a unique key for the current history entry.
 * Uses `window.history.state?.__lf_key` if available, falls back to path.
 */
export function getHistoryKey(path: string): string {
  const state = window.history.state as Record<string, unknown> | null;
  const key = state?.__lf_key;
  return typeof key === 'string' ? key : path;
}

/**
 * Generate a unique scroll position key and embed it in history state.
 * Called when pushing a new history entry.
 */
export function embedScrollKey(): string {
  const key = Math.random().toString(36).slice(2, 10);
  const existing = window.history.state as Record<string, unknown> | null;
  // Replace current state to attach __lf_key without a new history entry
  window.history.replaceState(
    { ...(existing ?? {}), __lf_key: key },
    '',
  );
  return key;
}

/**
 * Handle scroll after a push/replace navigation.
 * `savedFromKey` is the key captured (and scroll saved) before history.push()
 * was called, so it correctly refers to the previous entry's key.
 */
function handlePushScroll(to: Location, savedFromKey: string | null): void {
  // The previous position was already saved under savedFromKey before push.
  // Just update it now that we know the actual scroll coordinates.
  if (savedFromKey !== null) {
    saveScrollPosition(savedFromKey);
  }

  // After navigation, embed a key for the new entry and scroll
  const key = embedScrollKey();

  if (to.hash) {
    scrollToHash(to.hash);
  } else {
    window.scrollTo(0, 0);
  }

  // Stash the key so we can restore on pop later (initialise at 0,0)
  scrollPositions.set(key, { x: 0, y: 0 });
}

/**
 * Handle scroll after a pop (back/forward) navigation.
 */
function handlePopScroll(to: Location): void {
  const key = getHistoryKey(to.path);
  const saved = scrollPositions.get(key);

  if (saved) {
    setTimeout(() => {
      window.scrollTo({ left: saved.x, top: saved.y });
    }, 0);
  } else if (to.hash) {
    scrollToHash(to.hash);
  } else {
    window.scrollTo(0, 0);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create scroll handler callbacks to be called by the router around navigation.
 *
 * Returns three functions:
 * - `beforePush(from)`  — call BEFORE history.push(); saves current scroll + captures key
 * - `onPush(to)`        — call AFTER history.push(); embeds new key + scrolls
 * - `onPop(to)`         — call after pop (back/forward) navigation
 */
export function createScrollHandlers(behavior: ScrollBehavior): {
  beforePush: (from: Location | null) => void;
  onPush: (to: Location) => void;
  onPop: (to: Location) => void;
} {
  if (behavior === 'none') {
    return {
      beforePush: () => { /* noop */ },
      onPush: () => { /* noop */ },
      onPop: () => { /* noop */ },
    };
  }

  if (behavior === 'top') {
    // Captured key for the "from" entry — set in beforePush, consumed in onPush
    let capturedFromKey: string | null = null;

    return {
      beforePush: (from) => {
        if (from) {
          // Capture the key of the CURRENT (from) history entry before push changes state
          capturedFromKey = getHistoryKey(from.path);
          saveScrollPosition(capturedFromKey);
        } else {
          capturedFromKey = null;
        }
      },
      onPush: (to) => handlePushScroll(to, capturedFromKey),
      onPop: handlePopScroll,
    };
  }

  // Custom function — called after every navigation, no built-in position saving
  let capturedFrom: Location | null = null;
  return {
    beforePush: (from) => { capturedFrom = from; },
    onPush: (to) => { behavior(to, capturedFrom); },
    onPop: (to) => { behavior(to, null); },
  };
}

/**
 * Initialise scroll restoration.
 * Must be called once when the router is created.
 * Sets `history.scrollRestoration = 'manual'` so the browser doesn't
 * interfere with our own scroll position management.
 */
export function initScrollRestoration(): void {
  if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}

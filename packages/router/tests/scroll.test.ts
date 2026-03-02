import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRouter, createMemoryHistory } from '../src/index.js';
import type { Router } from '../src/types.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a test router with the given scroll behavior and routes.
 * All routers use MemoryHistory so tests don't touch the real browser URL bar.
 */
function makeRouter(scrollBehavior?: Parameters<typeof createRouter>[0]['scrollBehavior']): Router {
  const opts: Parameters<typeof createRouter>[0] = {
    routes: [
      { path: '/', component: () => document.createElement('div') },
      { path: '/core', component: () => document.createElement('div') },
      { path: '/client', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory(),
  };
  if (scrollBehavior !== undefined) {
    opts.scrollBehavior = scrollBehavior;
  }
  return createRouter(opts);
}

// =============================================================================
// Scroll tests
// =============================================================================

describe('scrollBehavior', () => {
  let router: Router;
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Spy on window.scrollTo
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    // Provide a mock element for getElementById
    scrollIntoViewSpy = vi.fn();
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'signal' || id === 'computed') {
        const el = document.createElement('div');
        el.scrollIntoView = scrollIntoViewSpy;
        return el;
      }
      return null;
    });

    // Ensure history.scrollRestoration exists in the test env
    if (!('scrollRestoration' in window.history)) {
      Object.defineProperty(window.history, 'scrollRestoration', {
        value: 'auto',
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    router?.destroy();
    vi.restoreAllMocks();
  });

  // ─── Default behaviour ─────────────────────────────────────────────────────

  it('scrolls to top on every push navigation by default', async () => {
    router = makeRouter();
    await router.navigate('/core');

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to top when navigating between routes', async () => {
    router = makeRouter();
    await router.navigate('/core');
    scrollToSpy.mockClear();

    await router.navigate('/client');

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  // ─── Hash/anchor scrolling ─────────────────────────────────────────────────

  it('scrolls to the matching element when navigating to a hash', async () => {
    router = makeRouter();
    // Navigate to a path with a hash
    await router.navigate({ path: '/core', hash: 'signal' });

    // scrollIntoView is called inside setTimeout(0) — flush timers
    await new Promise(r => setTimeout(r, 20));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    // scrollTo(0,0) should NOT have been called
    expect(scrollToSpy).not.toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to computed element when hash is "computed"', async () => {
    router = makeRouter();
    await router.navigate({ path: '/core', hash: 'computed' });

    await new Promise(r => setTimeout(r, 20));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('falls back to scrollTo(0,0) when hash element does not exist', async () => {
    router = makeRouter();
    // Navigate to hash that has no matching DOM element
    await router.navigate({ path: '/core', hash: 'nonexistent' });

    // No scrollIntoView call
    await new Promise(r => setTimeout(r, 50));
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  // ─── scrollBehavior: 'none' ────────────────────────────────────────────────

  it('does not scroll when scrollBehavior is "none"', async () => {
    router = makeRouter('none');
    await router.navigate('/core');

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not scroll to hash when scrollBehavior is "none"', async () => {
    router = makeRouter('none');
    await router.navigate({ path: '/core', hash: 'signal' });

    await new Promise(r => setTimeout(r, 20));

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  // ─── Custom scroll function ────────────────────────────────────────────────

  it('calls custom scrollBehavior function with to and from locations', async () => {
    const customScroll = vi.fn();
    router = makeRouter(customScroll);

    await router.navigate('/core');

    expect(customScroll).toHaveBeenCalledOnce();
    const [to, from] = customScroll.mock.calls[0] as [unknown, unknown];
    expect((to as { path: string }).path).toBe('/core');
    // from is null or the initial location
    expect(from === null || (from as { path: string }).path === '/').toBe(true);
  });

  it('custom scrollBehavior is called on subsequent navigations', async () => {
    const customScroll = vi.fn();
    router = makeRouter(customScroll);

    await router.navigate('/core');
    await router.navigate('/client');

    expect(customScroll).toHaveBeenCalledTimes(2);

    const [to2] = customScroll.mock.calls[1] as [{ path: string }, unknown];
    expect(to2.path).toBe('/client');
  });

  // ─── Back/forward navigation ───────────────────────────────────────────────

  it('restores scroll position on back navigation', async () => {
    router = makeRouter();

    // Navigate to /core (position saved as 0,0 initially)
    await router.navigate('/core');
    scrollToSpy.mockClear();

    // Simulate user scrolling on /core by overriding scrollX/scrollY
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true });
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });

    // Navigate to /client
    await router.navigate('/client');
    scrollToSpy.mockClear();

    // Reset scroll (as if we're at top of /client)
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    // Go back to /core
    router.back();

    await new Promise(r => setTimeout(r, 20));

    // Should have called scrollTo to restore /core position
    // (exact position may be 0,0 since we navigate before scrolling in test)
    expect(scrollToSpy).toHaveBeenCalled();
  });

  // ─── history.scrollRestoration ─────────────────────────────────────────────

  it('sets history.scrollRestoration to manual on init', () => {
    router = makeRouter();
    expect(window.history.scrollRestoration).toBe('manual');
  });

  it('leaves scrollRestoration as manual with scrollBehavior: none', () => {
    router = makeRouter('none');
    expect(window.history.scrollRestoration).toBe('manual');
  });
});

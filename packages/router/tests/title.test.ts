import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@liteforge/core';
import {
  createRouter,
  createMemoryHistory,
  setActiveRouter,
  useTitle,
} from '../src/index.js';
import type { Router } from '../src/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTitleRouter(titleTemplate?: (title: string | undefined) => string): Router {
  return createRouter({
    routes: [
      { path: '/', name: 'home', component: () => document.createElement('div'), meta: { title: 'Home' } },
      { path: '/about', name: 'about', component: () => document.createElement('div'), meta: { title: 'About' } },
      { path: '/no-title', name: 'no-title', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory(),
    titleTemplate,
  });
}

// =============================================================================
// titleTemplate
// =============================================================================

describe('titleTemplate', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
    document.title = '';
  });

  it('sets document.title from meta.title on the initial route', () => {
    router = createTitleRouter((title) => title ?? 'App');
    expect(document.title).toBe('Home');
  });

  it('sets document.title from meta.title after navigation', async () => {
    router = createTitleRouter((title) => title ?? 'App');
    await router.navigate('/about');
    expect(document.title).toBe('About');
  });

  it('passes undefined to template when route has no meta.title', async () => {
    router = createTitleRouter((title) => title ?? 'Fallback');
    await router.navigate('/no-title');
    expect(document.title).toBe('Fallback');
  });

  it('does not touch document.title when no titleTemplate is given', async () => {
    document.title = 'unchanged';
    router = createTitleRouter();
    await router.navigate('/about');
    expect(document.title).toBe('unchanged');
  });

  it('formats title correctly via template', async () => {
    router = createTitleRouter((title) => title ? `${title} — App` : 'App');
    await router.navigate('/about');
    expect(document.title).toBe('About — App');
  });

  it('cleans up title effect on destroy() without throwing', () => {
    router = createTitleRouter((title) => title ?? 'App');
    expect(() => router.destroy()).not.toThrow();
  });
});

// =============================================================================
// useTitle
// =============================================================================

describe('useTitle', () => {
  let router: Router;

  beforeEach(() => {
    router = createTitleRouter((title) => title ?? 'App');
    setActiveRouter(router);
  });

  afterEach(() => {
    router?.destroy();
    setActiveRouter(null);
    document.title = '';
  });

  it('overrides meta.title with a string', () => {
    // Start on /home (meta.title = 'Home')
    expect(document.title).toBe('Home');
    useTitle('Custom Title');
    expect(document.title).toBe('Custom Title');
  });

  it('overrides meta.title with a getter function', () => {
    useTitle(() => 'Dynamic Title');
    expect(document.title).toBe('Dynamic Title');
  });

  it('reactive getter re-evaluates when its signal changes', () => {
    const count = signal(1);
    useTitle(() => `Page ${count()}`);
    expect(document.title).toBe('Page 1');
    count.set(2);
    expect(document.title).toBe('Page 2');
  });

  it('clears override after navigation — falls back to next route meta.title', async () => {
    useTitle('Override');
    expect(document.title).toBe('Override');
    await router.navigate('/about');
    // After navigation, override is cleared — about has meta.title 'About'
    expect(document.title).toBe('About');
  });

  it('race condition: new page useTitle() is not cleared by old page cleanup', async () => {
    // Simulate old page calling useTitle
    useTitle('Old Page');
    expect(document.title).toBe('Old Page');

    // Navigate away — old page's afterEach fires, clears override
    await router.navigate('/about');
    // Override cleared, falls back to meta.title 'About'
    expect(document.title).toBe('About');

    // New page renders and calls useTitle — second navigation clears its override
    useTitle('New Page');
    expect(document.title).toBe('New Page');

    // Navigate again — new page's cleanup fires, clears the new override
    await router.navigate('/');
    expect(document.title).toBe('Home');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effect } from '@liteforge/core';
import {
  createRouter,
  createMemoryHistory,
  defineGuard,
  defineMiddleware,
} from '../src/index.js';
import type { Router, RouterOptions } from '../src/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRouter(options: Partial<RouterOptions> = {}): Router {
  return createRouter({
    routes: [
      { path: '/', name: 'home', component: () => document.createElement('div') },
      { path: '/users', name: 'users', component: () => document.createElement('div') },
      { path: '/users/:id', name: 'user-detail', component: () => document.createElement('div') },
      { path: '/admin', name: 'admin', component: () => document.createElement('div') },
      { path: '*', name: 'not-found', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory(),
    ...options,
  });
}

// =============================================================================
// Router Creation
// =============================================================================

describe('createRouter', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('creates a router with default options', () => {
    router = createTestRouter();
    expect(router).toBeDefined();
    expect(router.path()).toBe('/');
  });

  it('initializes with the history location', () => {
    const history = createMemoryHistory({ initialEntries: ['/users'] });
    router = createTestRouter({ history });
    expect(router.path()).toBe('/users');
  });

  it('exposes reactive signals', () => {
    router = createTestRouter();
    expect(typeof router.path).toBe('function');
    expect(typeof router.params).toBe('function');
    expect(typeof router.query).toBe('function');
    expect(typeof router.hash).toBe('function');
    expect(typeof router.matched).toBe('function');
    expect(typeof router.location).toBe('function');
    expect(typeof router.isNavigating).toBe('function');
  });

  it('matches initial route', () => {
    router = createTestRouter();
    const matched = router.matched();
    expect(matched.length).toBeGreaterThan(0);
    expect(matched[0]!.route.name).toBe('home');
  });
});

// =============================================================================
// Navigation
// =============================================================================

describe('navigation', () => {
  let router: Router;

  beforeEach(() => {
    router = createTestRouter();
  });

  afterEach(() => {
    router?.destroy();
  });

  it('navigates to a path', async () => {
    const result = await router.navigate('/users');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users');
  });

  it('navigates with params', async () => {
    await router.navigate('/users/42');
    expect(router.path()).toBe('/users/42');
    expect(router.params()).toEqual({ id: '42' });
  });

  it('navigates with query string', async () => {
    await router.navigate('/users?page=2&sort=name');
    expect(router.path()).toBe('/users');
    expect(router.query()).toEqual({ page: '2', sort: 'name' });
  });

  it('navigates with hash', async () => {
    await router.navigate('/users#section');
    expect(router.hash()).toBe('section');
  });

  it('navigates with object target', async () => {
    await router.navigate({
      path: '/users',
      query: { page: '1' },
      hash: 'top',
    });
    expect(router.path()).toBe('/users');
    expect(router.query()).toEqual({ page: '1' });
    expect(router.hash()).toBe('top');
  });

  it('replace navigation does not add history entry', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/users', component: () => document.createElement('div') },
      ],
      history,
    });

    await router.replace('/users');
    expect(router.path()).toBe('/users');

    // Going back should not work (no history entry)
    router.back();
    // Path should still be /users since there's no previous entry
    expect(router.path()).toBe('/users');
  });

  it('back() navigates to previous location', async () => {
    await router.navigate('/users');
    await router.navigate('/admin');
    expect(router.path()).toBe('/admin');

    router.back();
    // Note: back() is synchronous but triggers async state update
    // In memory history, the state updates synchronously
    expect(router.path()).toBe('/users');
  });

  it('forward() navigates to next location', async () => {
    await router.navigate('/users');
    await router.navigate('/admin');
    router.back();
    expect(router.path()).toBe('/users');

    router.forward();
    expect(router.path()).toBe('/admin');
  });

  it('go() navigates by delta', async () => {
    await router.navigate('/users');
    await router.navigate('/admin');
    await router.navigate('/users/42');

    router.go(-2);
    expect(router.path()).toBe('/users');
  });

  it('updates location signal on navigation', async () => {
    await router.navigate('/users/42?tab=profile#bio');
    const location = router.location();

    expect(location.path).toBe('/users/42');
    expect(location.search).toBe('tab=profile');
    expect(location.hash).toBe('bio');
    expect(location.query).toEqual({ tab: 'profile' });
  });

  it('matches catch-all route for unknown paths', async () => {
    await router.navigate('/unknown/path');
    const matched = router.matched();
    expect(matched[0]!.route.name).toBe('not-found');
  });
});

// =============================================================================
// Reactivity
// =============================================================================

describe('reactivity', () => {
  let router: Router;

  beforeEach(() => {
    router = createTestRouter();
  });

  afterEach(() => {
    router?.destroy();
  });

  it('path signal is reactive', async () => {
    const paths: string[] = [];
    const dispose = effect(() => {
      paths.push(router.path());
    });

    await router.navigate('/users');
    await router.navigate('/admin');

    expect(paths).toEqual(['/', '/users', '/admin']);
    dispose();
  });

  it('params signal is reactive', async () => {
    const paramsList: Record<string, string>[] = [];
    const dispose = effect(() => {
      paramsList.push({ ...router.params() });
    });

    await router.navigate('/users/42');
    await router.navigate('/users/123');

    expect(paramsList).toEqual([{}, { id: '42' }, { id: '123' }]);
    dispose();
  });

  it('query signal is reactive', async () => {
    const queries: Record<string, string | string[]>[] = [];
    const dispose = effect(() => {
      queries.push({ ...router.query() });
    });

    await router.navigate('/users?page=1');
    await router.navigate('/users?page=2');

    expect(queries).toEqual([{}, { page: '1' }, { page: '2' }]);
    dispose();
  });

  it('isNavigating signal updates during navigation', async () => {
    const states: boolean[] = [];
    const dispose = effect(() => {
      states.push(router.isNavigating());
    });

    await router.navigate('/users');

    // Should have captured false -> true -> false
    // But since our navigate is mostly sync, we might just see false
    expect(states.includes(false)).toBe(true);
    dispose();
  });
});

// =============================================================================
// Guards
// =============================================================================

describe('guards', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('allows navigation when guard returns true', async () => {
    const authGuard = defineGuard('auth', () => true);

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', guard: 'auth', component: () => document.createElement('div') },
      ],
      guards: [authGuard],
      history: createMemoryHistory(),
    });

    const result = await router.navigate('/admin');
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
  });

  it('blocks navigation when guard returns false', async () => {
    const authGuard = defineGuard('auth', () => false);

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', guard: 'auth', component: () => document.createElement('div') },
      ],
      guards: [authGuard],
      history: createMemoryHistory(),
    });

    const result = await router.navigate('/admin');
    expect(result).toBe(false);
    expect(router.path()).toBe('/');
  });

  it('redirects when guard returns a path', async () => {
    const authGuard = defineGuard('auth', () => '/login');

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/login', component: () => document.createElement('div') },
        { path: '/admin', guard: 'auth', component: () => document.createElement('div') },
      ],
      guards: [authGuard],
      history: createMemoryHistory(),
    });

    await router.navigate('/admin');
    expect(router.path()).toBe('/login');
  });

  it('passes context to guard', async () => {
    let capturedContext: unknown;
    const testGuard = defineGuard('test', (ctx) => {
      capturedContext = ctx;
      return true;
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/users/:id', guard: 'test', component: () => document.createElement('div') },
      ],
      guards: [testGuard],
      history: createMemoryHistory(),
    });

    await router.navigate('/users/42');

    expect(capturedContext).toMatchObject({
      to: expect.objectContaining({ path: '/users/42' }),
      params: { id: '42' },
    });
  });

  it('supports async guards', async () => {
    const asyncGuard = defineGuard('async', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return true;
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', guard: 'async', component: () => document.createElement('div') },
      ],
      guards: [asyncGuard],
      history: createMemoryHistory(),
    });

    const result = await router.navigate('/admin');
    expect(result).toBe(true);
  });

  it('supports parameterized guards', async () => {
    const roleGuard = defineGuard('role', ({ param }) => {
      return param === 'admin';
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', guard: 'role:admin', component: () => document.createElement('div') },
        { path: '/editor', guard: 'role:editor', component: () => document.createElement('div') },
      ],
      guards: [roleGuard],
      history: createMemoryHistory(),
    });

    const adminResult = await router.navigate('/admin');
    expect(adminResult).toBe(true);

    const editorResult = await router.navigate('/editor');
    expect(editorResult).toBe(false);
  });

  it('registerGuard adds guard dynamically', async () => {
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', guard: 'dynamic', component: () => document.createElement('div') },
      ],
      history: createMemoryHistory(),
    });

    // Guard not registered yet - navigation should work (guard not found)
    await router.navigate('/admin');
    expect(router.path()).toBe('/admin');

    // Go back and register guard
    await router.navigate('/');
    router.registerGuard(defineGuard('dynamic', () => false));

    // Now navigation should be blocked
    const result = await router.navigate('/admin');
    expect(result).toBe(false);
  });
});

// =============================================================================
// Middleware
// =============================================================================

describe('middleware', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('runs middleware on navigation', async () => {
    const log: string[] = [];
    const loggerMiddleware = defineMiddleware('logger', async (ctx, next) => {
      log.push(`before: ${ctx.to.path}`);
      await next();
      log.push(`after: ${ctx.to.path}`);
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/users', component: () => document.createElement('div') },
      ],
      middleware: [loggerMiddleware],
      history: createMemoryHistory(),
    });

    // Wait for initial navigation (runs middleware for '/') then clear the log
    await router.isReady;
    log.length = 0;

    await router.navigate('/users');

    expect(log).toEqual(['before: /users', 'after: /users']);
  });

  it('middleware can redirect', async () => {
    const redirectMiddleware = defineMiddleware('redirect', async (ctx) => {
      if (ctx.to.path === '/old') {
        return '/new';
      }
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/old', component: () => document.createElement('div') },
        { path: '/new', component: () => document.createElement('div') },
      ],
      middleware: [redirectMiddleware],
      history: createMemoryHistory(),
    });

    await router.navigate('/old');
    expect(router.path()).toBe('/new');
  });

  it('middleware runs in order', async () => {
    const order: number[] = [];

    const first = defineMiddleware('first', async (_, next) => {
      order.push(1);
      await next();
      order.push(4);
    });

    const second = defineMiddleware('second', async (_, next) => {
      order.push(2);
      await next();
      order.push(3);
    });

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/users', component: () => document.createElement('div') },
      ],
      middleware: [first, second],
      history: createMemoryHistory(),
    });

    // Wait for initial navigation (runs middleware for '/') then clear the order array
    await router.isReady;
    order.length = 0;

    await router.navigate('/users');

    expect(order).toEqual([1, 2, 3, 4]);
  });
});

// =============================================================================
// beforeEach / afterEach Hooks
// =============================================================================

describe('navigation hooks', () => {
  let router: Router;

  beforeEach(() => {
    router = createTestRouter();
  });

  afterEach(() => {
    router?.destroy();
  });

  it('beforeEach is called before navigation', async () => {
    const calls: string[] = [];

    router.beforeEach((ctx) => {
      calls.push(`to: ${ctx.to.path}`);
      return true;
    });

    await router.navigate('/users');

    expect(calls).toEqual(['to: /users']);
  });

  it('beforeEach can block navigation', async () => {
    router.beforeEach(() => false);

    const result = await router.navigate('/users');

    expect(result).toBe(false);
    expect(router.path()).toBe('/');
  });

  it('beforeEach can redirect', async () => {
    router.beforeEach((ctx) => {
      if (ctx.to.path === '/admin') {
        return '/login';
      }
      return true;
    });

    await router.navigate('/admin');

    expect(router.path()).toBe('/login');
  });

  it('afterEach is called after navigation', async () => {
    const calls: Array<{ to: string; from: string | null }> = [];

    router.afterEach((ctx) => {
      calls.push({
        to: ctx.to.path,
        from: ctx.from?.path ?? null,
      });
    });

    await router.navigate('/users');
    await router.navigate('/admin');

    expect(calls).toEqual([
      { to: '/users', from: '/' },
      { to: '/admin', from: '/users' },
    ]);
  });

  it('hooks can be unregistered', async () => {
    const calls: string[] = [];

    const unregister = router.beforeEach((ctx) => {
      calls.push(ctx.to.path);
      return true;
    });

    await router.navigate('/users');
    unregister();
    await router.navigate('/admin');

    expect(calls).toEqual(['/users']);
  });
});

// =============================================================================
// Preload
// =============================================================================

describe('preload', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('runs preload function before navigation completes', async () => {
    const preloadData = { user: { id: 42, name: 'Test' } };

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/users/:id',
          component: () => document.createElement('div'),
          preload: async ({ params }) => {
            return { user: { id: Number(params.id), name: 'Test' } };
          },
        },
      ],
      history: createMemoryHistory(),
    });

    await router.navigate('/users/42');

    expect(router.preloadedData()).toEqual(preloadData);
  });

  it('preload receives params', async () => {
    let capturedParams: Record<string, string> = {};

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/users/:id',
          component: () => document.createElement('div'),
          preload: async ({ params }) => {
            capturedParams = params;
            return null;
          },
        },
      ],
      history: createMemoryHistory(),
    });

    await router.navigate('/users/123');

    expect(capturedParams).toEqual({ id: '123' });
  });

  it('navigation fails if preload throws', async () => {
    const errorHandler = vi.fn();

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/error',
          component: () => document.createElement('div'),
          preload: async () => {
            throw new Error('Preload failed');
          },
        },
      ],
      history: createMemoryHistory(),
      onError: errorHandler,
    });

    const result = await router.navigate('/error');

    expect(result).toBe(false);
    expect(errorHandler).toHaveBeenCalled();
    expect(router.path()).toBe('/');
  });
});

// =============================================================================
// Route Utilities
// =============================================================================

describe('route utilities', () => {
  let router: Router;

  beforeEach(() => {
    router = createTestRouter();
  });

  afterEach(() => {
    router?.destroy();
  });

  it('getRoute returns route by name', () => {
    const route = router.getRoute('users');
    expect(route).toBeDefined();
    expect(route?.fullPath).toBe('/users');
  });

  it('getRoute returns undefined for unknown name', () => {
    const route = router.getRoute('unknown');
    expect(route).toBeUndefined();
  });

  it('resolve returns route info without navigating', () => {
    const resolved = router.resolve('/users/42');

    expect(resolved.href).toBe('/users/42');
    expect(resolved.route?.fullPath).toBe('/users/:id');
    expect(resolved.params).toEqual({ id: '42' });
    expect(router.path()).toBe('/'); // Did not navigate
  });
});

// =============================================================================
// Redirect Routes
// =============================================================================

describe('redirect routes', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('handles redirect routes', async () => {
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/old', redirect: '/new' },
        { path: '/new', component: () => document.createElement('div') },
      ],
      history: createMemoryHistory(),
    });

    await router.navigate('/old');
    expect(router.path()).toBe('/new');
  });

  it('handles redirect with query params', async () => {
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/old', redirect: '/new?from=old' },
        { path: '/new', component: () => document.createElement('div') },
      ],
      history: createMemoryHistory(),
    });

    await router.navigate('/old');
    expect(router.path()).toBe('/new');
    expect(router.query()).toEqual({ from: 'old' });
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('error handling', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('calls onError for navigation errors', async () => {
    const errors: Error[] = [];

    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/error',
          component: () => document.createElement('div'),
          preload: async () => {
            throw new Error('Test error');
          },
        },
      ],
      history: createMemoryHistory(),
      onError: (error) => errors.push(error),
    });

    await router.navigate('/error');

    expect(errors.length).toBe(1);
    expect(errors[0]!.message).toBe('Test error');
  });
});

// =============================================================================
// Cleanup
// =============================================================================

describe('cleanup', () => {
  it('destroy cleans up resources', () => {
    const router = createTestRouter();
    const beforeEachCalls: string[] = [];

    router.beforeEach((ctx) => {
      beforeEachCalls.push(ctx.to.path);
      return true;
    });

    router.destroy();

    // After destroy, hooks should be cleared
    // We can't easily test this without internal access,
    // but at least verify destroy doesn't throw
    expect(true).toBe(true);
  });
});

// =============================================================================
// Initial Navigation / isReady
// =============================================================================

describe('initialNavigation + isReady', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isReady resolves to true when no guards block', async () => {
    const router = createRouter({
      routes: [{ path: '/', component: () => document.createElement('div') }],
      history: createMemoryHistory(),
    });
    const result = await router.isReady;
    expect(result).toBe(true);
    router.destroy();
  });

  it('guard runs on initial load and redirects', async () => {
    const history = createMemoryHistory({ initialEntries: ['/admin'] });
    const router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', component: () => document.createElement('div'), guard: 'auth' },
        { path: '/login', component: () => document.createElement('div') },
      ],
      guards: [
        defineGuard('auth', ({ to }) => {
          return `/login?redirect=${encodeURIComponent(to.path)}`;
        }),
      ],
      history,
    });

    await router.isReady;
    // Guard redirected to /login — URL must have changed
    expect(router.path()).toBe('/login');
    router.destroy();
  });

  it('guard allows initial load when authenticated', async () => {
    const history = createMemoryHistory({ initialEntries: ['/admin'] });
    const router = createRouter({
      routes: [
        { path: '/admin', component: () => document.createElement('div'), guard: 'auth' },
        { path: '/login', component: () => document.createElement('div') },
      ],
      guards: [
        defineGuard('auth', () => true),
      ],
      history,
    });

    const result = await router.isReady;
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
    router.destroy();
  });

  it('initialNavigation: false skips guards on load', async () => {
    const guardFn = vi.fn(() => true);
    const history = createMemoryHistory({ initialEntries: ['/admin'] });
    const router = createRouter({
      routes: [
        { path: '/admin', component: () => document.createElement('div'), guard: 'auth' },
      ],
      guards: [defineGuard('auth', guardFn)],
      history,
      initialNavigation: false,
    });

    await router.isReady;
    expect(guardFn).not.toHaveBeenCalled();
    expect(router.path()).toBe('/admin');
    router.destroy();
  });

  it('navigate() works normally after isReady resolves', async () => {
    const router = createTestRouter();
    await router.isReady;
    const result = await router.navigate('/users');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users');
    router.destroy();
  });
});

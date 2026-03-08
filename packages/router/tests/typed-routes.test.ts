/**
 * Typed routes — Phase 1 tests
 *
 * Verifies that createRouter<T> + typed navigate() provide path-safety at
 * compile time, while remaining fully non-breaking for existing code.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { expectTypeOf } from 'vitest';
import { createRouter, createMemoryHistory } from '../src/index.js';
import type {
  FillParams,
  ExtractRoutePaths,
  TypedNavigationTarget,
  RouteDefinition,
} from '../src/index.js';

// =============================================================================
// Type-level utility tests (no runtime assertions needed)
// =============================================================================

describe('FillParams type utility', () => {
  it('leaves paths without params unchanged', () => {
    expectTypeOf<FillParams<'/home'>>().toEqualTypeOf<'/home'>();
    expectTypeOf<FillParams<'/'>>().toEqualTypeOf<'/'>();
    expectTypeOf<FillParams<'/users'>>().toEqualTypeOf<'/users'>();
  });

  it('replaces a single :param segment with ${string}', () => {
    expectTypeOf<FillParams<'/users/:id'>>().toEqualTypeOf<`/users/${string}`>();
  });

  it('replaces multiple :param segments', () => {
    expectTypeOf<FillParams<'/users/:id/posts/:postId'>>().toEqualTypeOf<`/users/${string}/posts/${string}`>();
  });

  it('replaces :param at the end of a multi-segment path', () => {
    expectTypeOf<FillParams<'/orgs/:org/teams/:team'>>().toEqualTypeOf<`/orgs/${string}/teams/${string}`>();
  });

  it('handles string (no literal) → string (no narrowing)', () => {
    // When T is widened to string, FillParams<string> should stay string
    expectTypeOf<FillParams<string>>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------

type TestRoutes = readonly [
  { readonly path: '/'; readonly name: 'home' },
  { readonly path: '/users'; readonly name: 'users' },
  { readonly path: '/users/:id'; readonly name: 'user-detail' },
  { readonly path: '/admin'; readonly name: 'admin' },
];

describe('ExtractRoutePaths type utility', () => {
  it('extracts all literal paths from a routes tuple', () => {
    expectTypeOf<ExtractRoutePaths<TestRoutes>>().toEqualTypeOf<
      '/' | '/users' | '/users/:id' | '/admin'
    >();
  });

  it('produces string for non-literal routes array', () => {
    expectTypeOf<ExtractRoutePaths<readonly RouteDefinition[]>>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------

describe('TypedNavigationTarget type utility', () => {
  it('produces the correct union of filled paths', () => {
    expectTypeOf<TypedNavigationTarget<TestRoutes>>().toEqualTypeOf<
      '/' | '/users' | `/users/${string}` | '/admin'
    >();
  });

  it('degrades to string for non-literal routes', () => {
    expectTypeOf<TypedNavigationTarget<readonly RouteDefinition[]>>().toEqualTypeOf<string>();
  });
});

// =============================================================================
// Runtime tests — createRouter with as const routes
// =============================================================================

const ROUTES = [
  { path: '/', name: 'home', component: () => document.createElement('div') },
  { path: '/users', name: 'users', component: () => document.createElement('div') },
  { path: '/users/:id', name: 'user-detail', component: () => document.createElement('div') },
  { path: '/admin', name: 'admin', component: () => document.createElement('div') },
  { path: '*', name: 'not-found', component: () => document.createElement('div') },
] as const;

describe('createRouter with typed routes', () => {
  let router: ReturnType<typeof createRouter<typeof ROUTES>>;

  afterEach(() => {
    router?.destroy();
  });

  it('creates a router instance successfully', () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    expect(router).toBeDefined();
    expect(router.path()).toBe('/');
  });

  it('navigate() to a valid static path resolves to true', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users');
  });

  it('navigate() to a valid parameterised path resolves to true', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users/42');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/42');
  });

  it('navigate() to root resolves to true', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    await router.navigate('/users');
    const result = await router.navigate('/');
    expect(result).toBe(true);
    expect(router.path()).toBe('/');
  });

  it('navigate() with a location object (always-accepted overload) works', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate({ path: '/admin', query: { tab: 'settings' } });
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
    expect(router.query()).toEqual({ tab: 'settings' });
  });

  it('replace() to a valid path resolves to true', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.replace('/admin');
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
  });

  // -------------------------------------------------------------------------
  // TypeScript compile-time safety — documented with @ts-expect-error
  // These show what the type system catches; they are NOT runtime assertions.
  // -------------------------------------------------------------------------

  it('TS rejects navigate() with an unknown path (@ts-expect-error)', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    // The comment below documents the intended compile-time constraint:
    // @ts-expect-error — '/unknown-xyz' is not a valid route path
    const result = await router.navigate('/unknown-xyz');
    // At runtime the router still processes the navigation (no match → 404 handling).
    // The constraint is compile-time only.
    expect(typeof result).toBe('boolean');
  });

  it('TS rejects replace() with an unknown path (@ts-expect-error)', async () => {
    router = createRouter({ routes: ROUTES, history: createMemoryHistory() });
    // @ts-expect-error — '/does-not-exist' is not a valid route path
    const result = await router.replace('/does-not-exist');
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Non-breaking: existing usage without as const continues to work
// =============================================================================

describe('createRouter without as const (non-breaking)', () => {
  it('accepts plain mutable routes array and returns a working router', async () => {
    const routes = [
      { path: '/', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ];
    const router = createRouter({ routes, history: createMemoryHistory() });
    expect(router).toBeDefined();

    // navigate() accepts any string when routes are not literal-typed
    const result = await router.navigate('/about');
    expect(result).toBe(true);

    router.destroy();
  });
});

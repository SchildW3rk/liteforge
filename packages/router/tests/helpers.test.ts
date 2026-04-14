import { describe, it, expect, afterEach } from 'vitest';
import { pushContext, popContext } from '../../runtime/src/context.js';
import {
  createRouter,
  createMemoryHistory,
  useEditParam,
  useParam,
  useParams,
  usePath,
  useQuery,
  useRouter,
} from '../src/index.js';
import type { Router } from '../src/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRouter(initialPath = '/'): Router {
  return createRouter({
    routes: [
      { path: '/', name: 'home', component: () => document.createElement('div') },
      { path: '/users/:id', name: 'user-detail', component: () => document.createElement('div') },
      { path: '/invoices/:invoiceId', name: 'invoice-detail', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory({ initialPath }),
  });
}

/**
 * Run fn with the given router injected into the context as 'router'.
 */
function withRouter<T>(router: Router, fn: () => T): T {
  pushContext({ router });
  try {
    return fn();
  } finally {
    popContext();
  }
}

// =============================================================================
// useEditParam
// =============================================================================

describe('useEditParam', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns editId and isEdit:true for a valid numeric id', async () => {
    router = createTestRouter('/users/42');
    await router.navigate('/users/42');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBe(42);
    expect(result.isEdit).toBe(true);
  });

  it('returns null/false when param is absent (on root route)', () => {
    router = createTestRouter('/');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('returns null/false for non-numeric param', async () => {
    router = createTestRouter('/users/abc');
    await router.navigate('/users/abc');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('returns null/false for zero', async () => {
    router = createTestRouter('/users/0');
    await router.navigate('/users/0');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('returns null/false for a negative number', async () => {
    router = createTestRouter('/users/-5');
    await router.navigate('/users/-5');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('returns null/false for NaN string', async () => {
    router = createTestRouter('/users/NaN');
    await router.navigate('/users/NaN');
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('supports a custom param name', async () => {
    router = createTestRouter('/invoices/7');
    await router.navigate('/invoices/7');
    const result = withRouter(router, () => useEditParam('invoiceId'));
    expect(result.editId).toBe(7);
    expect(result.isEdit).toBe(true);
  });

  it('returns null for custom param name when param is absent', () => {
    router = createTestRouter('/');
    const result = withRouter(router, () => useEditParam('invoiceId'));
    expect(result.editId).toBeNull();
    expect(result.isEdit).toBe(false);
  });

  it('handles floating point param values', async () => {
    router = createTestRouter('/users/3.14');
    await router.navigate('/users/3.14');
    // 3.14 is a finite positive number — Number('3.14') = 3.14
    const result = withRouter(router, () => useEditParam());
    expect(result.editId).toBe(3.14);
    expect(result.isEdit).toBe(true);
  });
});

// =============================================================================
// useParam
// =============================================================================

describe('useParam', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns a getter that reads the current route param', async () => {
    router = createTestRouter('/users/99');
    await router.navigate('/users/99');
    const id = withRouter(router, () => useParam('id'));
    expect(id()).toBe('99');
  });

  it('returns undefined for an absent param', () => {
    router = createTestRouter('/');
    const id = withRouter(router, () => useParam('id'));
    expect(id()).toBeUndefined();
  });
});

// =============================================================================
// useParams
// =============================================================================

describe('useParams', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns current params as a typed object', async () => {
    router = createTestRouter('/users/5');
    await router.navigate('/users/5');
    const params = withRouter(router, () => useParams<{ id: string }>());
    expect(params.id).toBe('5');
  });

  it('returns empty object on a route with no params', () => {
    router = createTestRouter('/');
    const params = withRouter(router, () => useParams());
    expect(params).toEqual({});
  });
});

// =============================================================================
// usePath
// =============================================================================

describe('usePath', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns a signal with the current path', async () => {
    router = createTestRouter('/users/1');
    await router.navigate('/users/1');
    const path = withRouter(router, () => usePath());
    expect(typeof path).toBe('function');
    expect(path()).toBe('/users/1');
  });
});

// =============================================================================
// useQuery
// =============================================================================

describe('useQuery', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns current query params', async () => {
    router = createRouter({
      routes: [{ path: '/search', name: 'search', component: () => document.createElement('div') }],
      history: createMemoryHistory({ initialPath: '/search?q=hello' }),
    });
    await router.navigate('/search?q=hello');
    const query = withRouter(router, () => useQuery<{ q?: string }>());
    expect(query.q).toBe('hello');
  });
});

// =============================================================================
// useRouter
// =============================================================================

describe('useRouter', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('returns the router from context', () => {
    router = createTestRouter('/');
    const r = withRouter(router, () => useRouter());
    expect(r).toBe(router);
  });
});

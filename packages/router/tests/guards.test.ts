import { describe, it, expect, vi } from 'vitest';
import {
  defineGuard,
  GuardRegistry,
  runGuards,
  normalizeGuardResult,
  createAuthGuard,
  createRoleGuard,
  createGuestGuard,
  createConfirmGuard,
} from '../src/guards.js';
import type { RouteGuard, GuardContext } from '../src/types.js';

// =============================================================================
// defineGuard
// =============================================================================

describe('defineGuard', () => {
  it('creates a guard with name and handler', () => {
    const guard = defineGuard('test', () => true);
    expect(guard.name).toBe('test');
    expect(typeof guard.handler).toBe('function');
  });

  it('handler receives context', async () => {
    let receivedContext: GuardContext | null = null;
    const guard = defineGuard('capture', (ctx) => {
      receivedContext = ctx;
      return true;
    });

    const mockContext = {
      to: { path: '/test', href: '/test', search: '', query: {}, hash: '', state: null },
      from: null,
      params: { id: '42' },
      route: {} as never,
      use: () => null as never,
    };

    await guard.handler(mockContext);
    expect(receivedContext).toBe(mockContext);
  });
});

// =============================================================================
// GuardRegistry
// =============================================================================

describe('GuardRegistry', () => {
  it('registers and retrieves guards', () => {
    const registry = new GuardRegistry();
    const guard = defineGuard('auth', () => true);

    registry.register(guard);
    expect(registry.get('auth')).toBe(guard);
  });

  it('has() checks if guard exists', () => {
    const registry = new GuardRegistry();
    const guard = defineGuard('auth', () => true);

    expect(registry.has('auth')).toBe(false);
    registry.register(guard);
    expect(registry.has('auth')).toBe(true);
  });

  it('registerAll registers multiple guards', () => {
    const registry = new GuardRegistry();
    const guards = [
      defineGuard('auth', () => true),
      defineGuard('role', () => true),
    ];

    registry.registerAll(guards);
    expect(registry.has('auth')).toBe(true);
    expect(registry.has('role')).toBe(true);
  });

  it('unregister removes a guard', () => {
    const registry = new GuardRegistry();
    const guard = defineGuard('auth', () => true);

    registry.register(guard);
    expect(registry.has('auth')).toBe(true);

    const result = registry.unregister('auth');
    expect(result).toBe(true);
    expect(registry.has('auth')).toBe(false);
  });

  it('unregister returns false for non-existent guard', () => {
    const registry = new GuardRegistry();
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('names() returns all guard names', () => {
    const registry = new GuardRegistry();
    registry.register(defineGuard('auth', () => true));
    registry.register(defineGuard('role', () => true));

    const names = registry.names();
    expect(names).toContain('auth');
    expect(names).toContain('role');
  });

  it('clear() removes all guards', () => {
    const registry = new GuardRegistry();
    registry.register(defineGuard('auth', () => true));
    registry.register(defineGuard('role', () => true));

    registry.clear();
    expect(registry.names()).toHaveLength(0);
  });

  it('getMap() returns the internal map', () => {
    const registry = new GuardRegistry();
    const guard = defineGuard('auth', () => true);
    registry.register(guard);

    const map = registry.getMap();
    expect(map.get('auth')).toBe(guard);
  });

  it('warns when overwriting a guard', () => {
    const registry = new GuardRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registry.register(defineGuard('auth', () => true));
    registry.register(defineGuard('auth', () => false));

    expect(warnSpy).toHaveBeenCalledWith('Guard "auth" is being overwritten');
    warnSpy.mockRestore();
  });
});

// =============================================================================
// normalizeGuardResult
// =============================================================================

describe('normalizeGuardResult', () => {
  it('normalizes true to allowed', () => {
    expect(normalizeGuardResult(true)).toEqual({ allowed: true });
  });

  it('normalizes false to blocked', () => {
    expect(normalizeGuardResult(false)).toEqual({ allowed: false });
  });

  it('normalizes string to redirect', () => {
    expect(normalizeGuardResult('/login')).toEqual({
      allowed: false,
      redirect: '/login',
    });
  });

  it('normalizes object to redirect', () => {
    const target = { path: '/login', query: { from: '/admin' } };
    expect(normalizeGuardResult(target)).toEqual({
      allowed: false,
      redirect: target,
    });
  });
});

// =============================================================================
// runGuards
// =============================================================================

describe('runGuards', () => {
  const mockContext = {
    to: { path: '/test', href: '/test', search: '', query: {}, hash: '', state: null },
    from: null,
    params: {},
    route: {} as never,
    use: () => null as never,
  };

  it('returns allowed when all guards pass', async () => {
    const guards: RouteGuard[] = [
      defineGuard('first', () => true),
      defineGuard('second', () => true),
    ];

    const result = await runGuards(guards, mockContext);
    expect(result.allowed).toBe(true);
  });

  it('returns blocked when a guard returns false', async () => {
    const guards: RouteGuard[] = [
      defineGuard('first', () => true),
      defineGuard('second', () => false),
    ];

    const result = await runGuards(guards, mockContext);
    expect(result.allowed).toBe(false);
  });

  it('returns redirect when a guard returns a path', async () => {
    const guards: RouteGuard[] = [
      defineGuard('auth', () => '/login'),
    ];

    const result = await runGuards(guards, mockContext);
    expect(result.allowed).toBe(false);
    expect(result.redirect).toBe('/login');
  });

  it('stops at first failing guard', async () => {
    const calls: string[] = [];
    const guards: RouteGuard[] = [
      defineGuard('first', () => {
        calls.push('first');
        return false;
      }),
      defineGuard('second', () => {
        calls.push('second');
        return true;
      }),
    ];

    await runGuards(guards, mockContext);
    expect(calls).toEqual(['first']);
  });

  it('handles async guards', async () => {
    const guards: RouteGuard[] = [
      defineGuard('async', async () => {
        await new Promise((r) => setTimeout(r, 5));
        return true;
      }),
    ];

    const result = await runGuards(guards, mockContext);
    expect(result.allowed).toBe(true);
  });

  it('handles guard errors gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const guards: RouteGuard[] = [
      defineGuard('error', () => {
        throw new Error('Guard error');
      }),
    ];

    const result = await runGuards(guards, mockContext);
    expect(result.allowed).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns allowed for empty guards array', async () => {
    const result = await runGuards([], mockContext);
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// Built-in Guards
// =============================================================================

describe('createAuthGuard', () => {
  const mockContext = {
    to: { path: '/admin', href: '/admin', search: '', query: {}, hash: '', state: null },
    from: null,
    params: {},
    route: {} as never,
    use: () => null as never,
  };

  it('allows when authenticated', async () => {
    const guard = createAuthGuard({ isAuthenticated: () => true });
    const result = await guard.handler(mockContext);
    expect(result).toBe(true);
  });

  it('redirects to login when not authenticated', async () => {
    const guard = createAuthGuard({ isAuthenticated: () => false });
    const result = await guard.handler(mockContext) as { path: string; query: Record<string, string>; replace: boolean };
    expect(result.path).toBe('/login');
    expect(result.query.redirect).toBe('/admin');
    expect(result.replace).toBe(true);
  });

  it('uses custom login path', async () => {
    const guard = createAuthGuard({ isAuthenticated: () => false, loginPath: '/auth/signin' });
    const result = await guard.handler(mockContext) as { path: string };
    expect(result.path).toBe('/auth/signin');
  });

  it('includes search in redirect URL', async () => {
    const guard = createAuthGuard({ isAuthenticated: () => false });
    const contextWithSearch = {
      ...mockContext,
      to: { ...mockContext.to, path: '/admin', search: 'tab=users' },
    };
    const result = await guard.handler(contextWithSearch) as { query: Record<string, string> };
    expect(result.query.redirect).toBe('/admintab=users');
  });

  it('replace: false pushes a new history entry', async () => {
    const guard = createAuthGuard({ isAuthenticated: () => false, replace: false });
    const result = await guard.handler(mockContext) as { replace: boolean };
    expect(result.replace).toBe(false);
  });
});

describe('createRoleGuard', () => {
  it('allows when user has role', async () => {
    const guard = createRoleGuard({ hasRole: (role) => role === 'admin' });
    const result = await guard.handler({
      to: { path: '/admin', href: '/admin', search: '', query: {}, hash: '', state: null },
      from: null,
      params: {},
      route: {} as never,
      use: () => null as never,
      param: 'admin',
    });
    expect(result).toBe(true);
  });

  it('redirects when user lacks role', async () => {
    const guard = createRoleGuard({ hasRole: (role) => role === 'admin' });
    const result = await guard.handler({
      to: { path: '/admin', href: '/admin', search: '', query: {}, hash: '', state: null },
      from: null,
      params: {},
      route: {} as never,
      use: () => null as never,
      param: 'editor',
    });
    expect(result).toBe('/unauthorized');
  });

  it('uses custom unauthorized path', async () => {
    const guard = createRoleGuard({ hasRole: () => false, unauthorizedPath: '/403' });
    const result = await guard.handler({
      to: { path: '/admin', href: '/admin', search: '', query: {}, hash: '', state: null },
      from: null,
      params: {},
      route: {} as never,
      use: () => null as never,
      param: 'admin',
    });
    expect(result).toBe('/403');
  });

  it('warns and blocks when no param provided', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const guard = createRoleGuard({ hasRole: () => true });
    const result = await guard.handler({
      to: { path: '/admin', href: '/admin', search: '', query: {}, hash: '', state: null },
      from: null,
      params: {},
      route: {} as never,
      use: () => null as never,
    });
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('createGuestGuard', () => {
  const mockContext = {
    to: { path: '/login', href: '/login', search: '', query: {}, hash: '', state: null },
    from: null,
    params: {},
    route: {} as never,
    use: () => null as never,
  };

  it('allows when not authenticated', async () => {
    const guard = createGuestGuard({ isAuthenticated: () => false });
    const result = await guard.handler(mockContext);
    expect(result).toBe(true);
  });

  it('redirects when authenticated', async () => {
    const guard = createGuestGuard({ isAuthenticated: () => true });
    const result = await guard.handler(mockContext);
    expect(result).toBe('/');
  });

  it('uses custom home path', async () => {
    const guard = createGuestGuard({ isAuthenticated: () => true, homePath: '/dashboard' });
    const result = await guard.handler(mockContext);
    expect(result).toBe('/dashboard');
  });
});

describe('createConfirmGuard', () => {
  const mockContext = {
    to: { path: '/other', href: '/other', search: '', query: {}, hash: '', state: null },
    from: null,
    params: {},
    route: {} as never,
    use: () => null as never,
  };

  it('allows when no confirmation needed', async () => {
    const guard = createConfirmGuard({ shouldConfirm: () => false });
    const result = await guard.handler(mockContext);
    expect(result).toBe(true);
  });

  it('allows in non-browser environment when confirmation needed', async () => {
    const guard = createConfirmGuard({ shouldConfirm: () => true });
    const result = await guard.handler(mockContext);
    expect(result).toBe(true);
  });

  it('uses custom message', async () => {
    // In happy-dom window.confirm may exist — mock it
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const guard = createConfirmGuard({
      shouldConfirm: () => true,
      message: 'Custom message',
    });
    await guard.handler(mockContext);
    expect(confirmSpy).toHaveBeenCalledWith('Custom message');
    confirmSpy.mockRestore();
  });
});

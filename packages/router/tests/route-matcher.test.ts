import { describe, it, expect } from 'vitest';
import {
  parsePath,
  parseQuery,
  stringifyQuery,
  createLocation,
  normalizePath,
  joinPaths,
  compilePath,
  compileRoute,
  compileRoutes,
  matchRoute,
  matchRoutes,
  matchRoutesSync,
  findRouteByName,
  generatePath,
  isPathActive,
  flattenRoutes,
} from '../src/route-matcher.js';
import type { RouteDefinition, RouteGuard } from '../src/types.js';

// =============================================================================
// parsePath
// =============================================================================

describe('parsePath', () => {
  it('parses simple path', () => {
    expect(parsePath('/users')).toEqual({
      path: '/users',
      search: '',
      hash: '',
    });
  });

  it('parses path with query string', () => {
    expect(parsePath('/users?page=1')).toEqual({
      path: '/users',
      search: 'page=1',
      hash: '',
    });
  });

  it('parses path with hash', () => {
    expect(parsePath('/users#section')).toEqual({
      path: '/users',
      search: '',
      hash: 'section',
    });
  });

  it('parses path with query and hash', () => {
    expect(parsePath('/users?page=1#section')).toEqual({
      path: '/users',
      search: 'page=1',
      hash: 'section',
    });
  });

  it('handles root path', () => {
    expect(parsePath('/')).toEqual({
      path: '/',
      search: '',
      hash: '',
    });
  });

  it('handles empty path', () => {
    expect(parsePath('')).toEqual({
      path: '/',
      search: '',
      hash: '',
    });
  });

  it('handles complex query strings', () => {
    expect(parsePath('/search?q=hello+world&sort=date&order=desc')).toEqual({
      path: '/search',
      search: 'q=hello+world&sort=date&order=desc',
      hash: '',
    });
  });

  it('handles hash before query (unusual but valid)', () => {
    // Hash should come after query according to URL spec
    // But we handle this edge case
    expect(parsePath('/page#hash?query')).toEqual({
      path: '/page',
      search: '',
      hash: 'hash?query',
    });
  });
});

// =============================================================================
// parseQuery
// =============================================================================

describe('parseQuery', () => {
  it('parses empty query', () => {
    expect(parseQuery('')).toEqual({});
  });

  it('parses single param', () => {
    expect(parseQuery('page=1')).toEqual({ page: '1' });
  });

  it('parses multiple params', () => {
    expect(parseQuery('page=1&sort=date')).toEqual({
      page: '1',
      sort: 'date',
    });
  });

  it('handles array params (multiple same keys)', () => {
    expect(parseQuery('tag=a&tag=b&tag=c')).toEqual({
      tag: ['a', 'b', 'c'],
    });
  });

  it('handles encoded values', () => {
    expect(parseQuery('q=hello%20world')).toEqual({
      q: 'hello world',
    });
  });

  it('handles empty values', () => {
    expect(parseQuery('flag=&other=value')).toEqual({
      flag: '',
      other: 'value',
    });
  });
});

// =============================================================================
// stringifyQuery
// =============================================================================

describe('stringifyQuery', () => {
  it('stringifies empty query', () => {
    expect(stringifyQuery({})).toBe('');
  });

  it('stringifies single param', () => {
    expect(stringifyQuery({ page: '1' })).toBe('page=1');
  });

  it('stringifies multiple params', () => {
    const result = stringifyQuery({ page: '1', sort: 'date' });
    expect(result).toContain('page=1');
    expect(result).toContain('sort=date');
  });

  it('stringifies array params', () => {
    const result = stringifyQuery({ tag: ['a', 'b'] });
    expect(result).toBe('tag=a&tag=b');
  });
});

// =============================================================================
// createLocation
// =============================================================================

describe('createLocation', () => {
  it('creates location from string path', () => {
    const location = createLocation('/users/42?tab=profile#bio');
    expect(location).toEqual({
      href: '/users/42?tab=profile#bio',
      path: '/users/42',
      search: 'tab=profile',
      query: { tab: 'profile' },
      hash: 'bio',
      state: null,
    });
  });

  it('creates location from object', () => {
    const location = createLocation({
      path: '/users',
      query: { page: '2' },
      hash: 'section',
    });
    expect(location.path).toBe('/users');
    expect(location.query).toEqual({ page: '2' });
    expect(location.hash).toBe('section');
    expect(location.href).toBe('/users?page=2#section');
  });

  it('preserves state', () => {
    const state = { scrollPos: 100 };
    const location = createLocation('/page', state);
    expect(location.state).toBe(state);
  });

  it('handles object with state', () => {
    const location = createLocation({
      path: '/page',
      state: { data: 'test' },
    });
    expect(location.state).toEqual({ data: 'test' });
  });
});

// =============================================================================
// normalizePath
// =============================================================================

describe('normalizePath', () => {
  it('adds leading slash', () => {
    expect(normalizePath('users')).toBe('/users');
  });

  it('removes trailing slash', () => {
    expect(normalizePath('/users/')).toBe('/users');
  });

  it('keeps root path intact', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('removes duplicate slashes', () => {
    expect(normalizePath('//users//posts//')).toBe('/users/posts');
  });

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('/');
  });

  it('handles complex path', () => {
    expect(normalizePath('users//42///posts/')).toBe('/users/42/posts');
  });
});

// =============================================================================
// joinPaths
// =============================================================================

describe('joinPaths', () => {
  it('joins parent and child paths', () => {
    expect(joinPaths('/admin', '/users')).toBe('/admin/users');
  });

  it('handles child without leading slash', () => {
    expect(joinPaths('/admin', 'users')).toBe('/admin/users');
  });

  it('handles root child path', () => {
    expect(joinPaths('/admin', '/')).toBe('/admin');
  });

  it('handles empty child path', () => {
    expect(joinPaths('/admin', '')).toBe('/admin');
  });

  it('handles root parent path', () => {
    expect(joinPaths('/', '/users')).toBe('/users');
  });

  it('normalizes result', () => {
    expect(joinPaths('/admin/', '/users/')).toBe('/admin/users');
  });
});

// =============================================================================
// compilePath
// =============================================================================

describe('compilePath', () => {
  it('compiles static path', () => {
    const { regex, paramNames, isCatchAll } = compilePath('/users');
    expect(paramNames).toEqual([]);
    expect(isCatchAll).toBe(false);
    expect(regex.test('/users')).toBe(true);
    expect(regex.test('/users/')).toBe(false);
    expect(regex.test('/users/42')).toBe(false);
  });

  it('compiles path with single param', () => {
    const { regex, paramNames } = compilePath('/users/:id');
    expect(paramNames).toEqual(['id']);
    expect(regex.test('/users/42')).toBe(true);
    expect(regex.test('/users/abc')).toBe(true);
    expect(regex.test('/users')).toBe(false);
    expect(regex.test('/users/42/posts')).toBe(false);
  });

  it('compiles path with multiple params', () => {
    const { regex, paramNames } = compilePath('/users/:userId/posts/:postId');
    expect(paramNames).toEqual(['userId', 'postId']);
    expect(regex.test('/users/42/posts/123')).toBe(true);

    const match = regex.exec('/users/42/posts/123');
    expect(match?.[1]).toBe('42');
    expect(match?.[2]).toBe('123');
  });

  it('compiles optional parameter', () => {
    const { regex, paramNames } = compilePath('/users/:id?');
    expect(paramNames).toEqual(['id']);
    expect(regex.test('/users')).toBe(true);
    expect(regex.test('/users/42')).toBe(true);
  });

  it('compiles catch-all route *', () => {
    const { regex, paramNames, isCatchAll } = compilePath('*');
    expect(isCatchAll).toBe(true);
    expect(paramNames).toEqual(['*']);
    expect(regex.test('/anything')).toBe(true);
    expect(regex.test('/any/nested/path')).toBe(true);
    expect(regex.test('/')).toBe(true);
  });

  it('compiles catch-all route /*', () => {
    const { regex, isCatchAll } = compilePath('/*');
    expect(isCatchAll).toBe(true);
    expect(regex.test('/anything')).toBe(true);
    expect(regex.test('/')).toBe(true);
  });

  it('compiles path with catch-all suffix', () => {
    const { regex, isCatchAll } = compilePath('/admin/*');
    expect(isCatchAll).toBe(true);
    expect(regex.test('/admin')).toBe(true);
    expect(regex.test('/admin/users')).toBe(true);
    expect(regex.test('/admin/users/42')).toBe(true);
    expect(regex.test('/other')).toBe(false);
  });

  it('compiles root path', () => {
    const { regex } = compilePath('/');
    expect(regex.test('/')).toBe(true);
    expect(regex.test('/users')).toBe(false);
  });

  it('escapes regex special characters in static segments', () => {
    const { regex } = compilePath('/api/v1.0');
    expect(regex.test('/api/v1.0')).toBe(true);
    expect(regex.test('/api/v1X0')).toBe(false); // . should not match any char
  });
});

// =============================================================================
// compileRoute & compileRoutes
// =============================================================================

describe('compileRoute', () => {
  const guardRegistry = new Map<string, RouteGuard>();
  const mockGuard: RouteGuard = {
    name: 'auth',
    handler: () => true,
  };
  guardRegistry.set('auth', mockGuard);

  it('compiles simple route', () => {
    const def: RouteDefinition = {
      path: '/users',
      component: () => document.createElement('div'),
    };
    const route = compileRoute(def, null, guardRegistry);

    expect(route.path).toBe('/users');
    expect(route.fullPath).toBe('/users');
    expect(route.paramNames).toEqual([]);
    expect(route.parent).toBeNull();
    expect(route.children).toEqual([]);
  });

  it('compiles route with guards from registry', () => {
    const def: RouteDefinition = {
      path: '/admin',
      guard: 'auth',
    };
    const route = compileRoute(def, null, guardRegistry);
    // String guards are stored in guardSpec for runtime resolution
    expect(route.guardSpec).toBe('auth');
    // Inline guards array is empty since 'auth' is a string reference
    expect(route.guards).toHaveLength(0);
  });

  it('compiles route with parameterized guard', () => {
    const roleGuard: RouteGuard = {
      name: 'role',
      handler: (ctx) => ctx.param === 'admin',
    };
    const registry = new Map([['role', roleGuard]]);

    const def: RouteDefinition = {
      path: '/admin',
      guard: 'role:admin',
    };
    const route = compileRoute(def, null, registry);
    // String guards are stored in guardSpec for runtime resolution
    expect(route.guardSpec).toBe('role:admin');
    // Inline guards array is empty since it's a string reference
    expect(route.guards).toHaveLength(0);
  });

  it('compiles route with inline guard objects', () => {
    const inlineGuard: RouteGuard = {
      name: 'inline',
      handler: () => true,
    };
    const def: RouteDefinition = {
      path: '/protected',
      guard: inlineGuard,
    };
    const route = compileRoute(def, null, new Map());
    // Inline guard objects are stored directly in guards array
    expect(route.guards).toHaveLength(1);
    expect(route.guards[0]!.name).toBe('inline');
  });

  it('compiles nested routes', () => {
    const def: RouteDefinition = {
      path: '/admin',
      children: [
        { path: '/users', component: () => document.createElement('div') },
        { path: '/settings', component: () => document.createElement('div') },
      ],
    };
    const route = compileRoute(def, null, guardRegistry);

    expect(route.children).toHaveLength(2);
    expect(route.children[0]!.fullPath).toBe('/admin/users');
    expect(route.children[1]!.fullPath).toBe('/admin/settings');
    expect(route.children[0]!.parent).toBe(route);
  });

  it('preserves meta information', () => {
    const def: RouteDefinition = {
      path: '/page',
      meta: { requiresAuth: true, title: 'My Page' },
    };
    const route = compileRoute(def, null, guardRegistry);
    expect(route.meta).toEqual({ requiresAuth: true, title: 'My Page' });
  });

  it('handles redirect route', () => {
    const def: RouteDefinition = {
      path: '/old-path',
      redirect: '/new-path',
    };
    const route = compileRoute(def, null, guardRegistry);
    expect(route.redirect).toBe('/new-path');
  });
});

describe('compileRoutes', () => {
  it('compiles array of routes', () => {
    const routes = compileRoutes([
      { path: '/', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
      { path: '*', component: () => document.createElement('div') },
    ]);

    expect(routes).toHaveLength(3);
    expect(routes[0]!.fullPath).toBe('/');
    expect(routes[1]!.fullPath).toBe('/users');
    expect(routes[2]!.isCatchAll).toBe(true);
  });
});

// =============================================================================
// matchRoute
// =============================================================================

describe('matchRoute', () => {
  it('matches static path', () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/users', routes[0]!);
    expect(match).not.toBeNull();
    expect(match?.params).toEqual({});
  });

  it('returns null for non-matching path', () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/posts', routes[0]!);
    expect(match).toBeNull();
  });

  it('extracts params', () => {
    const routes = compileRoutes([
      { path: '/users/:id', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/users/42', routes[0]!);
    expect(match).not.toBeNull();
    expect(match?.params).toEqual({ id: '42' });
  });

  it('extracts multiple params', () => {
    const routes = compileRoutes([
      { path: '/users/:userId/posts/:postId', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/users/42/posts/123', routes[0]!);
    expect(match?.params).toEqual({ userId: '42', postId: '123' });
  });

  it('decodes URI-encoded params', () => {
    const routes = compileRoutes([
      { path: '/search/:query', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/search/hello%20world', routes[0]!);
    expect(match?.params).toEqual({ query: 'hello world' });
  });

  it('matches catch-all route', () => {
    const routes = compileRoutes([
      { path: '/files/*', component: () => document.createElement('div') },
    ]);
    const match = matchRoute('/files/path/to/file.txt', routes[0]!);
    expect(match).not.toBeNull();
    expect(match?.params['*']).toBe('path/to/file.txt');
  });
});

// =============================================================================
// matchRoutes
// =============================================================================

describe('matchRoutes', () => {
  it('matches first matching route', async () => {
    const routes = compileRoutes([
      { path: '/', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
    ]);
    const match = await matchRoutes('/users', routes);
    expect(match).not.toBeNull();
    expect(match![0]!.route.fullPath).toBe('/users');
  });

  it('returns null when no route matches', async () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
    ]);
    const match = await matchRoutes('/posts', routes);
    expect(match).toBeNull();
  });

  it('matches catch-all route last', async () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
      { path: '*', component: () => document.createElement('div') },
    ]);

    const usersMatch = await matchRoutes('/users', routes);
    expect(usersMatch![0]!.route.fullPath).toBe('/users');

    const anyMatch = await matchRoutes('/anything', routes);
    expect(anyMatch![0]!.route.isCatchAll).toBe(true);
  });

  it('strips query string before matching', async () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
    ]);
    const match = await matchRoutes('/users?page=1', routes);
    expect(match).not.toBeNull();
  });

  it('handles nested routes', async () => {
    const routes = compileRoutes([
      {
        path: '/admin',
        component: () => document.createElement('div'),
        children: [
          { path: '/users', component: () => document.createElement('div') },
          { path: '/settings', component: () => document.createElement('div') },
        ],
      },
    ]);

    const match = await matchRoutes('/admin/users', routes);
    expect(match).not.toBeNull();
    expect(match?.length).toBeGreaterThanOrEqual(1);
    // Should include parent route in chain
    const fullPaths = match?.map((m) => m.route.fullPath);
    expect(fullPaths).toContain('/admin/users');
  });
});

// =============================================================================
// findRouteByName
// =============================================================================

describe('findRouteByName', () => {
  it('finds top-level route by name', () => {
    const routes = compileRoutes([
      { path: '/', name: 'home', component: () => document.createElement('div') },
      { path: '/users', name: 'users', component: () => document.createElement('div') },
    ]);

    const route = findRouteByName('users', routes);
    expect(route).not.toBeUndefined();
    expect(route?.fullPath).toBe('/users');
  });

  it('finds nested route by name', () => {
    const routes = compileRoutes([
      {
        path: '/admin',
        name: 'admin',
        children: [
          { path: '/users', name: 'admin-users', component: () => document.createElement('div') },
        ],
      },
    ]);

    const route = findRouteByName('admin-users', routes);
    expect(route).not.toBeUndefined();
    expect(route?.fullPath).toBe('/admin/users');
  });

  it('returns undefined for unknown name', () => {
    const routes = compileRoutes([
      { path: '/', name: 'home', component: () => document.createElement('div') },
    ]);

    const route = findRouteByName('unknown', routes);
    expect(route).toBeUndefined();
  });
});

// =============================================================================
// generatePath
// =============================================================================

describe('generatePath', () => {
  it('generates static path', () => {
    const routes = compileRoutes([
      { path: '/users', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!)).toBe('/users');
  });

  it('generates path with params', () => {
    const routes = compileRoutes([
      { path: '/users/:id', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!, { id: '42' })).toBe('/users/42');
  });

  it('generates path with multiple params', () => {
    const routes = compileRoutes([
      { path: '/users/:userId/posts/:postId', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!, { userId: '42', postId: '123' })).toBe('/users/42/posts/123');
  });

  it('encodes param values', () => {
    const routes = compileRoutes([
      { path: '/search/:query', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!, { query: 'hello world' })).toBe('/search/hello%20world');
  });

  it('handles optional params not provided', () => {
    const routes = compileRoutes([
      { path: '/users/:id?', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!)).toBe('/users');
  });

  it('handles optional params provided', () => {
    const routes = compileRoutes([
      { path: '/users/:id?', component: () => document.createElement('div') },
    ]);
    expect(generatePath(routes[0]!, { id: '42' })).toBe('/users/42');
  });
});

// =============================================================================
// isPathActive
// =============================================================================

describe('isPathActive', () => {
  it('exact match returns true', () => {
    expect(isPathActive('/users', '/users', true)).toBe(true);
  });

  it('exact match returns false for partial', () => {
    expect(isPathActive('/users/42', '/users', true)).toBe(false);
  });

  it('partial match returns true for prefix', () => {
    expect(isPathActive('/users/42', '/users', false)).toBe(true);
  });

  it('partial match handles root path', () => {
    expect(isPathActive('/users', '/', false)).toBe(true);
    expect(isPathActive('/', '/', false)).toBe(true);
  });

  it('normalizes paths before comparing', () => {
    expect(isPathActive('/users/', '/users', true)).toBe(true);
    expect(isPathActive('users', '/users', true)).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isPathActive('/posts', '/users', false)).toBe(false);
  });

  it('handles path prefix that is substring but not segment', () => {
    // /usersettings should NOT match /users
    expect(isPathActive('/usersettings', '/users', false)).toBe(false);
  });
});

// =============================================================================
// flattenRoutes
// =============================================================================

describe('flattenRoutes', () => {
  it('flattens nested routes', () => {
    const routes = compileRoutes([
      {
        path: '/admin',
        children: [
          { path: '/users', component: () => document.createElement('div') },
          {
            path: '/settings',
            children: [
              { path: '/general', component: () => document.createElement('div') },
            ],
          },
        ],
      },
      { path: '/home', component: () => document.createElement('div') },
    ]);

    const flat = flattenRoutes(routes);
    expect(flat.length).toBe(5); // admin, users, settings, general, home

    const paths = flat.map((r) => r.fullPath);
    expect(paths).toContain('/admin');
    expect(paths).toContain('/admin/users');
    expect(paths).toContain('/admin/settings');
    expect(paths).toContain('/admin/settings/general');
    expect(paths).toContain('/home');
  });

  it('handles empty routes', () => {
    const flat = flattenRoutes([]);
    expect(flat).toEqual([]);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles routes with similar prefixes correctly', async () => {
    const routes = compileRoutes([
      { path: '/user', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
      { path: '/users/:id', component: () => document.createElement('div') },
    ]);

    expect((await matchRoutes('/user', routes))![0]!.route.fullPath).toBe('/user');
    expect((await matchRoutes('/users', routes))![0]!.route.fullPath).toBe('/users');
    expect((await matchRoutes('/users/42', routes))![0]!.route.fullPath).toBe('/users/:id');
  });

  it('handles deeply nested params', () => {
    const routes = compileRoutes([
      { path: '/:org/:repo/:branch', component: () => document.createElement('div') },
    ]);

    // Test param extraction for paths with multiple segments
    const route = routes[0]!;
    const match = matchRoute('/liteforge/core/main', route);
    expect(match).not.toBeNull();
    expect(match?.params).toEqual({
      org: 'liteforge',
      repo: 'core',
      branch: 'main',
    });
  });

  it('handles unicode in paths', async () => {
    const routes = compileRoutes([
      { path: '/users/:name', component: () => document.createElement('div') },
    ]);

    const match = await matchRoutes('/users/%E4%B8%AD%E6%96%87', routes);
    expect(match![0]!.params.name).toBe('中文');
  });

  it('handles special characters in static paths', async () => {
    const routes = compileRoutes([
      { path: '/api/v1.0/data', component: () => document.createElement('div') },
    ]);

    const match = await matchRoutes('/api/v1.0/data', routes);
    expect(match).not.toBeNull();
  });

  it('matches /:param/segment child route (regression #20)', async () => {
    // Bug: prefix check used literal startsWith('/customers/:id/') which never matched
    // a real path like '/customers/2/edit'. Fixed by param-aware prefix regex.
    const routes = compileRoutes([
      {
        path: '/',
        component: () => document.createElement('div'),
        children: [
          { path: '/customers/:id',      component: () => document.createElement('div') },
          { path: '/customers/:id/edit', component: () => document.createElement('div') },
        ],
      },
    ]);

    const detailMatch = await matchRoutes('/customers/2', routes);
    expect(detailMatch).not.toBeNull();
    expect(detailMatch![detailMatch!.length - 1]!.route.fullPath).toBe('/customers/:id');
    expect(detailMatch![detailMatch!.length - 1]!.params).toEqual({ id: '2' });

    const editMatch = await matchRoutes('/customers/2/edit', routes);
    expect(editMatch).not.toBeNull();
    expect(editMatch![editMatch!.length - 1]!.route.fullPath).toBe('/customers/:id/edit');
    expect(editMatch![editMatch!.length - 1]!.params).toEqual({ id: '2' });
  });

  it('sync matcher also resolves /:param/segment child routes (regression #20)', () => {
    const routes = compileRoutes([
      {
        path: '/',
        component: () => document.createElement('div'),
        children: [
          { path: '/customers/:id',      component: () => document.createElement('div') },
          { path: '/customers/:id/edit', component: () => document.createElement('div') },
        ],
      },
    ]);

    const editMatch = matchRoutesSync('/customers/2/edit', routes);
    expect(editMatch).not.toBeNull();
    expect(editMatch![editMatch!.length - 1]!.route.fullPath).toBe('/customers/:id/edit');
    expect(editMatch![editMatch!.length - 1]!.params).toEqual({ id: '2' });
  });
});

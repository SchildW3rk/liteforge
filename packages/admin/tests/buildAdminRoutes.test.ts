import { describe, it, expect, vi } from 'vitest';
import { buildAdminRoutes } from '../src/router/buildAdminRoutes.js';
import { defineResource } from '../src/core/defineResource.js';
import type { Client } from '@liteforge/client';

function makeMockClient(): Client {
  return { resource: vi.fn() } as unknown as Client;
}

const fullResource = defineResource({
  name: 'posts',
  endpoint: '/posts',
  list: { columns: [] },
});

const readOnlyResource = defineResource({
  name: 'logs',
  endpoint: '/logs',
  actions: ['index', 'show'],
  list: { columns: [] },
});

const indexOnlyResource = defineResource({
  name: 'reports',
  endpoint: '/reports',
  actions: ['index'],
  list: { columns: [] },
});

describe('buildAdminRoutes', () => {
  it('returns a single top-level route with basePath', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/admin');
  });

  it('includes AdminLayout as the top-level component', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    expect(routes[0].component).toBeTypeOf('function');
  });

  it('generates 4 child routes for a resource with all actions', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    // + 1 for the default redirect
    const resourceRoutes = children.filter(r => r.path.includes('posts'));
    expect(resourceRoutes).toHaveLength(4); // index, new, :id, :id/edit
  });

  it('generates correct paths for all actions', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    const paths = children.map(r => r.path);

    expect(paths).toContain('/posts');
    expect(paths).toContain('/posts/new');
    expect(paths).toContain('/posts/:id');
    expect(paths).toContain('/posts/:id/edit');
  });

  it('skips routes for missing actions', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [readOnlyResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    const paths = children.map(r => r.path);

    // index + show = 2 resource routes (+ 1 redirect)
    expect(paths).toContain('/logs');
    expect(paths).toContain('/logs/:id');
    expect(paths).not.toContain('/logs/new');
    expect(paths).not.toContain('/logs/:id/edit');
  });

  it('only generates index route when only index action', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [indexOnlyResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    const paths = children.map(r => r.path);

    expect(paths).toContain('/reports');
    expect(paths.filter(p => p.includes('reports'))).toHaveLength(1);
  });

  it('generates routes for multiple resources', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource, readOnlyResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    const paths = children.map(r => r.path);

    expect(paths).toContain('/posts');
    expect(paths).toContain('/logs');
  });

  it('uses custom basePath', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/dashboard/admin',
      client,
    });

    expect(routes[0].path).toBe('/dashboard/admin');
  });

  it('includes default redirect child when resources provided', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    const redirectRoute = children.find(r => r.path === '/');
    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.redirect).toBeDefined();
  });

  it('each resource route component is a function', () => {
    const client = makeMockClient();
    const routes = buildAdminRoutes({
      resources: [fullResource],
      basePath: '/admin',
      client,
    });

    const children = routes[0].children ?? [];
    for (const child of children) {
      if (child.component !== undefined) {
        expect(child.component).toBeTypeOf('function');
      }
    }
  });
});

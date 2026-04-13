import type { RouteDefinition } from '@liteforge/router';
import type { Client } from '@liteforge/client';
import type { ResourceDefinition, DashboardConfig } from '../types.js';
import { DataTable } from '../components/DataTable.js';
import { DetailView } from '../components/DetailView.js';
import { ResourceForm } from '../components/ResourceForm.js';
import { AdminLayout } from '../components/AdminLayout.js';
import { Dashboard } from '../components/Dashboard.js';
import { ActivityLogView } from '../components/ActivityLogView.js';

export interface BuildAdminRoutesOptions {
  resources: ResourceDefinition<any>[];
  basePath: string;
  client: Client;
  title?: string;
  logo?: string | (() => Node);
  unstyled?: boolean;
  dashboard?: DashboardConfig;
  showActivityLog?: boolean;
  /**
   * URL prefix for all generated routes. Defaults to `basePath`.
   * Use `''` for root-level routes.
   *
   * @example
   * ```ts
   * buildAdminRoutes({ resources, basePath: '/admin', prefix: '/back-office', client })
   * // → /back-office/users, /back-office/users/:id, etc.
   * ```
   */
  prefix?: string;
  /**
   * Custom layout component to wrap the admin routes.
   * Defaults to the built-in `AdminLayout`.
   * Receives the same props as `AdminLayout` — the component is called with
   * `{ resources, basePath, title?, logo?, extraNavLinks? }`.
   *
   * @example
   * ```ts
   * buildAdminRoutes({ resources, basePath: '/admin', layout: AppLayout, client })
   * ```
   */
  layout?: (props: object) => Node;
}

export function buildAdminRoutes(opts: BuildAdminRoutesOptions): RouteDefinition[] {
  const { resources, basePath, client, title, logo } = opts;
  // prefix controls the URL prefix; defaults to basePath for backward compat
  const routePrefix = opts.prefix !== undefined ? opts.prefix : basePath;
  const LayoutComponent = opts.layout ?? AdminLayout;

  const childRoutes: RouteDefinition[] = [];

  // Index route: dashboard or redirect to first resource
  if (opts.dashboard) {
    childRoutes.push({
      path: '/',
      component: () => Dashboard({ config: opts.dashboard!, client, basePath }),
    });
  } else {
    const firstResource = resources[0];
    if (firstResource) {
      childRoutes.push({
        path: '/',
        redirect: `${basePath}/${firstResource.name}`,
      });
    }
  }

  for (const resource of resources) {
    const { name, actions } = resource;
    const base = `${basePath}/${name}`;

    if (actions.includes('index')) {
      childRoutes.push({
        path: `/${name}`,
        component: () => DataTable({ resource, client, basePath }),
      });
    }

    if (actions.includes('create')) {
      childRoutes.push({
        path: `/${name}/new`,
        component: () => ResourceForm({ resource, client, mode: 'create', basePath }),
      });
    }

    if (actions.includes('show')) {
      childRoutes.push({
        path: `/${name}/:id`,
        component: () => DetailView({ resource, client, basePath }),
      });
    }

    if (actions.includes('edit')) {
      childRoutes.push({
        path: `/${name}/:id/edit`,
        component: () => ResourceForm({ resource, client, mode: 'edit', basePath }),
      });
    }

    // suppress unused variable warning
    void base;
  }

  if (opts.showActivityLog) {
    childRoutes.push({
      path: '/activity',
      component: () => ActivityLogView(),
    });
  }

  const layoutProps: Record<string, unknown> = { resources, basePath };
  if (title) layoutProps['title'] = title;
  if (logo) layoutProps['logo'] = logo;
  if (opts.showActivityLog) {
    layoutProps['extraNavLinks'] = [{ label: '📋 Activity Log', path: `${routePrefix}/activity` }];
  }

  return [
    {
      path: routePrefix,
      component: () => LayoutComponent(layoutProps),
      children: childRoutes,
    },
  ];
}

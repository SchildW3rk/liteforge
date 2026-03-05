import type { RouteDefinition } from '@liteforge/router';
import type { Client } from '@liteforge/client';
import type { ResourceDefinition } from '../types.js';
import { DataTable } from '../components/DataTable.js';
import { DetailView } from '../components/DetailView.js';
import { ResourceForm } from '../components/ResourceForm.js';
import { AdminLayout } from '../components/AdminLayout.js';

export interface BuildAdminRoutesOptions {
  resources: ResourceDefinition[];
  basePath: string;
  client: Client;
  title?: string;
  logo?: string | (() => Node);
  unstyled?: boolean;
}

export function buildAdminRoutes(opts: BuildAdminRoutesOptions): RouteDefinition[] {
  const { resources, basePath, client, title, logo } = opts;

  const childRoutes: RouteDefinition[] = [];

  // Default index redirect
  const firstResource = resources[0];
  if (firstResource) {
    childRoutes.push({
      path: '/',
      redirect: `${basePath}/${firstResource.name}`,
    });
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

  const layoutProps: import('../components/AdminLayout.js').AdminLayoutProps = {
    resources,
    basePath,
  };
  if (title) layoutProps.title = title;
  if (logo) layoutProps.logo = logo;

  return [
    {
      path: basePath,
      component: () => AdminLayout(layoutProps),
      children: childRoutes,
    },
  ];
}

import { effect } from '@liteforge/core';
import { h, use } from '@liteforge/runtime';
import { RouterOutlet } from '@liteforge/router';
import type { Router } from '@liteforge/router';
import type { ResourceDefinition } from '../types.js';

export interface AdminLayoutProps {
  resources: ResourceDefinition[];
  basePath: string;
  title?: string;
  logo?: string | (() => Node);
}

export function AdminLayout(props: AdminLayoutProps): Node {
  const { resources, basePath, title = 'Admin', logo } = props;

  let router: Router | undefined;
  try {
    router = use<Router>('router');
  } catch {
    // no-op
  }

  // Logo child: either the logo() Node, a logo string, or the title string
  const logoChild: Node | string = logo
    ? (typeof logo === 'function' ? logo() : logo)
    : title;

  const logoEl = h('a', {
    class: 'lf-admin-sidebar__logo',
    onclick: (e: Event) => {
      e.preventDefault();
      const first = resources[0];
      if (router && first) {
        void router.navigate(`${basePath}/${first.name}`);
      }
    },
  }, logoChild);

  // Nav links
  const links: Array<{ el: HTMLElement; path: string }> = [];

  const navChildren: Node[] = resources.map((resource) => {
    const path = `${basePath}/${resource.name}`;
    const btn = h('button', {
      class: 'lf-admin-sidebar__link',
      onclick: () => {
        if (router) void router.navigate(path);
      },
    }, resource.label) as HTMLElement;
    links.push({ el: btn, path });
    return btn;
  });

  const breadcrumb = h('span', { class: 'lf-admin-header__breadcrumb' }, title);

  const root = h('div', { class: 'lf-admin' },
    h('aside', { class: 'lf-admin-sidebar' },
      logoEl,
      h('nav', { class: 'lf-admin-sidebar__nav' }, ...navChildren),
    ),
    h('div', { class: 'lf-admin-body' },
      h('header', { class: 'lf-admin-header' },
        breadcrumb,
      ),
      h('main', { class: 'lf-admin-content' },
        RouterOutlet(),
      ),
    ),
  );

  // Active link effect
  if (router) {
    effect(() => {
      const path = router!.path();
      for (const link of links) {
        if (path.startsWith(link.path)) {
          link.el.classList.add('lf-admin-sidebar__link--active');
        } else {
          link.el.classList.remove('lf-admin-sidebar__link--active');
        }
      }

      // Update breadcrumb
      const active = resources.find(r => path.startsWith(`${basePath}/${r.name}`));
      breadcrumb.textContent = active ? `${title} / ${active.label}` : title;
    });
  }

  return root;
}

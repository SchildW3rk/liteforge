// No imports — pure string constants

export const INSTALL_CODE = `pnpm add @liteforge/admin`
export const IMPORT_CODE  = `import { defineResource, registerResource, buildAdminRoutes, adminPlugin } from '@liteforge/admin';`

export const DEFINE_CODE = `import { defineResource, registerResource } from '@liteforge/admin';

const posts = defineResource({
  name: 'posts',
  label: 'Blog Posts',       // optional — defaults to capitalize(name)
  endpoint: '/api/posts',
  actions: ['index', 'show', 'create', 'edit', 'destroy'],
  list: {
    columns: [
      { field: 'id',    label: 'ID',     sortable: true },
      { field: 'title', label: 'Title',  sortable: true },
      { field: 'status',label: 'Status', type: 'badge'  },
    ],
    searchable: ['title'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    pageSize: 20,
  },
  form: {
    layout: 'two-column',
    fields: [
      { field: 'title',   label: 'Title',   type: 'text',   required: true, span: 'full' },
      { field: 'status',  label: 'Status',  type: 'select',
        options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] },
      { field: 'content', label: 'Content', type: 'textarea', span: 'full' },
    ],
  },
  hooks: {
    beforeCreate: (data) => ({ ...data, createdAt: new Date().toISOString() }),
    beforeDestroy: async (id) => {
      return confirm(\`Delete post \${id}?\`);
    },
  },
});

registerResource(posts);`

export const ROUTER_CODE = `import { createRouter } from '@liteforge/router';
import { buildAdminRoutes } from '@liteforge/admin';
import { createClient } from '@liteforge/client';

const client = createClient({ baseUrl: 'https://api.example.com' });
const resources = [...resourceRegistry.values()];

const router = createRouter({
  routes: [
    // Your app routes...
    { path: '/', component: Home },
    // Admin routes — generated from registered resources:
    ...buildAdminRoutes({ resources, basePath: '/admin', client }),
  ],
});`

export const PLUGIN_CODE = `const app = await createApp({ root: App, target: '#app' })
  .use(routerPlugin({ router }))
  .use(clientPlugin({ baseUrl: 'https://api.example.com' }))
  .use(adminPlugin({
    basePath: '/admin',    // default: '/admin'
    title: 'My Admin',    // default: 'Admin'
    unstyled: false,       // default: false — injects CSS variables + BEM styles
  }))
  .mount();`

export const HOOKS_CODE = `const users = defineResource({
  name: 'users',
  endpoint: '/api/users',
  list: { columns: [{ field: 'name', label: 'Name' }] },
  hooks: {
    beforeCreate: async (data) => {
      // Transform data before POST
      return { ...data, role: 'user' };
    },
    afterCreate: (record) => {
      console.log('User created:', record.id);
    },
    beforeEdit: (data) => data,
    afterEdit: (record) => {},
    beforeDestroy: async (id) => {
      // Return false to cancel deletion
      return window.confirm('Are you sure?');
    },
    afterDestroy: (id) => {
      toast.success(\`Deleted \${id}\`);
    },
  },
});`

export const CUSTOM_CELL_CODE = `const orders = defineResource({
  name: 'orders',
  endpoint: '/api/orders',
  list: {
    columns: [
      { field: 'id', label: 'Order' },
      { field: 'total', label: 'Total',
        renderCell: (value) => {
          const span = document.createElement('span');
          span.style.fontWeight = '600';
          span.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD',
          }).format(value as number);
          return span;
        }
      },
      { field: 'status', label: 'Status', type: 'badge' },
    ],
  },
  rowActions: [
    {
      label: 'Refund',
      show: (record) => record.status === 'paid',
      action: async (record) => {
        await api.post(\`/orders/\${record.id}/refund\`);
      },
    },
  ],
});`

export const RELATION_CODE = `const posts = defineResource({
  name: 'posts',
  endpoint: '/api/posts',
  list: { columns: [{ field: 'author', label: 'Author' }] },
  form: {
    fields: [
      { field: 'authorId', label: 'Author', type: 'relation',
        relation: { resource: 'users', labelField: 'name' } },
    ],
  },
});`

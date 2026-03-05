import { createComponent } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Code strings ──────────────────────────────────────────────────────────────

const INSTALL_CODE = `pnpm add @liteforge/admin`;
const IMPORT_CODE  = `import { defineResource, registerResource, buildAdminRoutes, adminPlugin } from 'liteforge/admin';`;

const DEFINE_CODE = `import { defineResource, registerResource } from 'liteforge/admin';

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

registerResource(posts);`;

const ROUTER_CODE = `import { createRouter } from 'liteforge/router';
import { buildAdminRoutes } from 'liteforge/admin';
import { createClient } from 'liteforge/client';

const client = createClient({ baseUrl: 'https://api.example.com' });
const resources = [...resourceRegistry.values()];

const router = createRouter({
  routes: [
    // Your app routes...
    { path: '/', component: Home },
    // Admin routes — generated from registered resources:
    ...buildAdminRoutes({ resources, basePath: '/admin', client }),
  ],
});`;

const PLUGIN_CODE = `const app = await createApp({ root: App, target: '#app' })
  .use(routerPlugin({ router }))
  .use(clientPlugin({ baseUrl: 'https://api.example.com' }))
  .use(adminPlugin({
    basePath: '/admin',    // default: '/admin'
    title: 'My Admin',    // default: 'Admin'
    unstyled: false,       // default: false — injects CSS variables + BEM styles
  }))
  .mount();`;

const HOOKS_CODE = `const users = defineResource({
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
});`;

const CUSTOM_CELL_CODE = `const orders = defineResource({
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
});`;

const RELATION_CODE = `const posts = defineResource({
  name: 'posts',
  endpoint: '/api/posts',
  list: { columns: [{ field: 'author', label: 'Author' }] },
  form: {
    fields: [
      { field: 'authorId', label: 'Author', type: 'relation',
        relation: { resource: 'users', labelField: 'name' } },
    ],
  },
});`;

// ─── API rows ───────────────────────────────────────────────────────────────────

const DEFINE_RESOURCE_API: ApiRow[] = [
  { name: 'name',     type: 'string',              description: 'Resource identifier. Used as URL segment in admin routes.' },
  { name: 'label',    type: 'string',  default: 'capitalize(name)', description: 'Human-readable label shown in sidebar and page titles.' },
  { name: 'endpoint', type: 'string',              description: 'API endpoint path (e.g., /api/posts). Passed to @liteforge/client.' },
  { name: 'schema',   type: 'z.ZodObject',         description: 'Optional Zod schema for form validation.' },
  { name: 'actions',  type: "AdminAction[]", default: "['index','show','create','edit','destroy']", description: 'Which CRUD routes to generate.' },
  { name: 'list',     type: 'ListConfig',           description: 'Column definitions, searchable fields, sort, pagination, and filters.' },
  { name: 'show',     type: 'ShowConfig?',          description: 'Fields to display in the detail view. Defaults to all list columns.' },
  { name: 'form',     type: 'FormConfig?',          description: 'Form fields and layout for create/edit views.' },
  { name: 'hooks',    type: 'ResourceHooks?',       description: 'before/after hooks for create, edit, and destroy operations.' },
  { name: 'rowActions', type: 'RowAction[]?',       description: 'Custom per-row actions in addition to View/Edit/Delete.' },
];

const FIELD_TYPES_API: ApiRow[] = [
  { name: 'text',     type: 'FieldType', description: '<input type="text"> — default for strings.' },
  { name: 'textarea', type: 'FieldType', description: '<textarea> — for multi-line text.' },
  { name: 'number',   type: 'FieldType', description: '<input type="number">.' },
  { name: 'date',     type: 'FieldType', description: '<input type="date">. Formatted via Intl.DateTimeFormat in list/detail views.' },
  { name: 'boolean',  type: 'FieldType', description: '<input type="checkbox">. Shown as ✅/❌ in list/detail.' },
  { name: 'select',   type: 'FieldType', description: '<select> with options array.' },
  { name: 'badge',    type: 'FieldType', description: 'Renders value as a styled badge span in list/detail.' },
  { name: 'image',    type: 'FieldType', description: '<input type="url"> for form; rendered as <img> in list/detail.' },
  { name: 'relation', type: 'FieldType', description: '<select> populated from a related resource (via client).' },
  { name: 'custom',   type: 'FieldType', description: 'Calls renderCell(value, record) for list or renderForm(getValue, setValue) for forms.' },
];

const PLUGIN_API: ApiRow[] = [
  { name: 'basePath',  type: 'string',  default: "'/admin'", description: 'Base URL prefix for all admin routes.' },
  { name: 'title',     type: 'string',  default: "'Admin'",  description: 'Title shown in the sidebar header.' },
  { name: 'logo',      type: 'string | (() => Node)', description: 'Custom logo text or DOM node factory.' },
  { name: 'unstyled',  type: 'boolean', default: 'false',    description: 'Skip injecting the default CSS. Use your own styles via BEM classes.' },
];

const HOOKS_API: ApiRow[] = [
  { name: 'beforeCreate',  type: '(data) => data | Promise<data>',          description: 'Transform payload before POST. Return modified data.' },
  { name: 'afterCreate',   type: '(record: T) => void',                     description: 'Called after successful create with the server response.' },
  { name: 'beforeEdit',    type: '(data) => data | Promise<data>',          description: 'Transform payload before PUT/PATCH.' },
  { name: 'afterEdit',     type: '(record: T) => void',                     description: 'Called after successful edit.' },
  { name: 'beforeDestroy', type: '(id) => boolean | Promise<boolean>',      description: 'Return false to cancel deletion. Useful for confirmation dialogs.' },
  { name: 'afterDestroy',  type: '(id: string | number) => void',           description: 'Called after successful deletion.' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const AdminPage = createComponent({
  name: 'AdminPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/admin</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">Admin Panel</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            Signals-based admin panel with auto-generated CRUD routes and views.
            Define resources declaratively — the package generates a sidebar, DataTable with sorting/filtering/pagination,
            detail view, and create/edit forms with optional Zod validation.
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title="Define a resource"
          id="define-resource"
          description="defineResource() creates a frozen resource definition with all CRUD configuration. Call registerResource() to add it to the admin registry."
        >
          <CodeBlock code={DEFINE_CODE} language="typescript" />
          <ApiTable rows={DEFINE_RESOURCE_API} />
        </DocSection>

        <DocSection
          title="Router integration"
          id="router"
          description="Since @liteforge/router doesn't support dynamic route addition, include buildAdminRoutes() in your createRouter() config. It returns a flat RouteDefinition[] with AdminLayout as the parent."
        >
          <CodeBlock code={ROUTER_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Plugin setup"
          id="plugin"
          description="adminPlugin() injects CSS variables, registers the 'admin' context key, and warns if no resources are registered. Requires routerPlugin and clientPlugin to already be registered."
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={PLUGIN_API} />
        </DocSection>

        <DocSection
          title="Field types"
          id="field-types"
          description="Each field type controls the input rendered in forms and the cell rendered in list/detail views."
        >
          <ApiTable rows={FIELD_TYPES_API} />
        </DocSection>

        <DocSection
          title="Lifecycle hooks"
          id="hooks"
          description="Hooks fire around each CRUD operation. beforeDestroy returning false cancels the operation — no HTTP call is made."
        >
          <CodeBlock code={HOOKS_CODE} language="typescript" />
          <ApiTable rows={HOOKS_API} />
        </DocSection>

        <DocSection
          title="Custom cells &amp; row actions"
          id="custom"
          description="renderCell() lets you return any Node for a table cell. rowActions adds per-row buttons beyond the default View/Edit/Delete."
        >
          <CodeBlock code={CUSTOM_CELL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Relation fields"
          id="relations"
          description="The 'relation' field type renders a select populated from another registered resource. Specify the resource name and the field to use as the option label."
        >
          <CodeBlock code={RELATION_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});

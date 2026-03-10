import { createComponent, use } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export const AdminPage = createComponent({
  name: 'AdminPage',
  component() {
    const { t } = use('i18n');

    const getDefineResourceApi = (): ApiRow[] => [
      { name: 'name',     type: 'string',              description: t('admin.apiName') },
      { name: 'label',    type: 'string',  default: 'capitalize(name)', description: t('admin.apiLabel') },
      { name: 'endpoint', type: 'string',              description: t('admin.apiEndpoint') },
      { name: 'schema',   type: 'z.ZodObject',         description: t('admin.apiSchema') },
      { name: 'actions',  type: "AdminAction[]", default: "['index','show','create','edit','destroy']", description: t('admin.apiActions') },
      { name: 'list',     type: 'ListConfig',           description: t('admin.apiList') },
      { name: 'show',     type: 'ShowConfig?',          description: t('admin.apiShow') },
      { name: 'form',     type: 'FormConfig?',          description: t('admin.apiForm') },
      { name: 'hooks',    type: 'ResourceHooks?',       description: t('admin.apiHooks') },
      { name: 'rowActions', type: 'RowAction[]?',       description: t('admin.apiRowActions') },
    ];

    const getFieldTypesApi = (): ApiRow[] => [
      { name: 'text',     type: 'FieldType', description: t('admin.fieldText') },
      { name: 'textarea', type: 'FieldType', description: t('admin.fieldTextarea') },
      { name: 'number',   type: 'FieldType', description: t('admin.fieldNumber') },
      { name: 'date',     type: 'FieldType', description: t('admin.fieldDate') },
      { name: 'boolean',  type: 'FieldType', description: t('admin.fieldBoolean') },
      { name: 'select',   type: 'FieldType', description: t('admin.fieldSelect') },
      { name: 'badge',    type: 'FieldType', description: t('admin.fieldBadge') },
      { name: 'image',    type: 'FieldType', description: t('admin.fieldImage') },
      { name: 'relation', type: 'FieldType', description: t('admin.fieldRelation') },
      { name: 'custom',   type: 'FieldType', description: t('admin.fieldCustom') },
    ];

    const getPluginApi = (): ApiRow[] => [
      { name: 'basePath',  type: 'string',  default: "'/admin'", description: t('admin.pluginBasePath') },
      { name: 'title',     type: 'string',  default: "'Admin'",  description: t('admin.pluginTitle') },
      { name: 'logo',      type: 'string | (() => Node)', description: t('admin.pluginLogo') },
      { name: 'unstyled',  type: 'boolean', default: 'false',    description: t('admin.pluginUnstyled') },
    ];

    const getHooksApi = (): ApiRow[] => [
      { name: 'beforeCreate',  type: '(data) => data | Promise<data>',          description: t('admin.hookBeforeCreate') },
      { name: 'afterCreate',   type: '(record: T) => void',                     description: t('admin.hookAfterCreate') },
      { name: 'beforeEdit',    type: '(data) => data | Promise<data>',          description: t('admin.hookBeforeEdit') },
      { name: 'afterEdit',     type: '(record: T) => void',                     description: t('admin.hookAfterEdit') },
      { name: 'beforeDestroy', type: '(id) => boolean | Promise<boolean>',      description: t('admin.hookBeforeDestroy') },
      { name: 'afterDestroy',  type: '(id: string | number) => void',           description: t('admin.hookAfterDestroy') },
    ];

    setToc([
      { id: 'define-resource', label: () => t('admin.defineResource'),     level: 2 },
      { id: 'router',          label: () => t('admin.routerIntegration'),  level: 2 },
      { id: 'plugin',          label: () => t('admin.pluginSetup'),        level: 2 },
      { id: 'field-types',     label: () => t('admin.fieldTypes'),         level: 2 },
      { id: 'hooks',           label: () => t('admin.hooks'),              level: 2 },
      { id: 'custom',          label: () => t('admin.customCells'),        level: 2 },
      { id: 'relations',       label: () => t('admin.relations'),          level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/admin</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">{() => t('admin.title')}</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            {() => t('admin.subtitle')}
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title={() => t('admin.defineResource')}
          id="define-resource"
          description={() => t('admin.defineResourceDesc')}
        >
          <CodeBlock code={DEFINE_CODE} language="typescript" />
          <ApiTable rows={() => getDefineResourceApi()} />
        </DocSection>

        <DocSection
          title={() => t('admin.routerIntegration')}
          id="router"
          description={() => t('admin.routerIntegrationDesc')}
        >
          <CodeBlock code={ROUTER_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('admin.pluginSetup')}
          id="plugin"
          description={() => t('admin.pluginSetupDesc')}
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={() => getPluginApi()} />
        </DocSection>

        <DocSection
          title={() => t('admin.fieldTypes')}
          id="field-types"
          description={() => t('admin.fieldTypesDesc')}
        >
          <ApiTable rows={() => getFieldTypesApi()} />
        </DocSection>

        <DocSection
          title={() => t('admin.hooks')}
          id="hooks"
          description={() => t('admin.hooksDesc')}
        >
          <CodeBlock code={HOOKS_CODE} language="typescript" />
          <ApiTable rows={() => getHooksApi()} />
        </DocSection>

        <DocSection
          title={() => t('admin.customCells')}
          id="custom"
          description={() => t('admin.customCellsDesc')}
        >
          <CodeBlock code={CUSTOM_CELL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('admin.relations')}
          id="relations"
          description={() => t('admin.relationsDesc')}
        >
          <CodeBlock code={RELATION_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});

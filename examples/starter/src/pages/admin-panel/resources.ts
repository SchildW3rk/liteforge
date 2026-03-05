import { defineResource, registerResource } from 'liteforge/admin';
import type { Client, ListResponse } from 'liteforge/client';

// ─── Resource Types ────────────────────────────────────────────────────────────

interface Post {
  id: string;
  title: string;
  status: 'draft' | 'published';
  author: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  active: boolean;
  createdAt: string;
}

// ─── Mock Data Store ───────────────────────────────────────────────────────────

let nextId = 100;

const postsStore: Record<string, unknown>[] = [
  { id: '1', title: 'Getting Started with LiteForge', status: 'published', author: 'René', createdAt: '2026-01-15T10:00:00Z' },
  { id: '2', title: 'Signals vs Virtual DOM', status: 'published', author: 'René', createdAt: '2026-02-01T12:00:00Z' },
  { id: '3', title: 'Building Admin Panels', status: 'draft', author: 'René', createdAt: '2026-02-20T09:30:00Z' },
  { id: '4', title: 'Deep Dive into Effects', status: 'published', author: 'René', createdAt: '2026-03-01T14:00:00Z' },
  { id: '5', title: 'Router Internals', status: 'draft', author: 'René', createdAt: '2026-03-03T11:00:00Z' },
];

const usersStore: Record<string, unknown>[] = [
  { id: '1', name: 'René Schildböck', email: 'rene@liteforge.dev', role: 'admin', active: true, createdAt: '2025-12-01T08:00:00Z' },
  { id: '2', name: 'Anna Müller', email: 'anna@example.com', role: 'editor', active: true, createdAt: '2026-01-10T09:00:00Z' },
  { id: '3', name: 'Tom Weber', email: 'tom@example.com', role: 'viewer', active: false, createdAt: '2026-01-20T10:00:00Z' },
];

interface Post {
  id: string;
  title: string;
  status: 'draft' | 'published';
  author: string;
  createdAt: string;
}

// ─── Mock Client Factory ───────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function paginate<T>(items: T[], page = 1, pageSize = 20): ListResponse<T> {
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return {
    data,
    meta: {
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    },
  };
}

export function createMockClient(): Client {
  function resource<T = Record<string, unknown>>(endpoint: string) {
    const getStore = (): Record<string, unknown>[] => {
      if (endpoint.includes('posts')) return postsStore;
      if (endpoint.includes('users')) return usersStore;
      return [];
    };

    return {
      async getList(params: Record<string, unknown> = {}): Promise<ListResponse<T>> {
        await delay(300);
        let items = [...getStore()];

        // Search
        if (params['search'] && typeof params['search'] === 'string') {
          const q = (params['search'] as string).toLowerCase();
          items = items.filter(item =>
            Object.values(item).some(v => String(v).toLowerCase().includes(q)),
          );
        }

        // Sort
        if (params['sort']) {
          const field = params['sort'] as string;
          const dir = params['order'] === 'desc' ? -1 : 1;
          items.sort((a, b) => {
            const av = String(a[field] ?? '');
            const bv = String(b[field] ?? '');
            return av.localeCompare(bv) * dir;
          });
        }

        return paginate(items as T[], Number(params['page'] ?? 1), Number(params['pageSize'] ?? 20));
      },

      async getOne(id: string | number): Promise<T> {
        await delay(200);
        const item = getStore().find(i => String(i['id']) === String(id));
        if (!item) throw new Error(`Not found: ${id}`);
        return item as T;
      },

      async create(data: unknown): Promise<T> {
        await delay(400);
        const item = { ...(data as Record<string, unknown>), id: String(++nextId) };
        getStore().push(item);
        return item as T;
      },

      async update(id: string | number, data: unknown): Promise<T> {
        await delay(400);
        const store = getStore();
        const idx = store.findIndex(i => String(i['id']) === String(id));
        if (idx === -1) throw new Error(`Not found: ${id}`);
        store[idx] = { ...store[idx], ...(data as Record<string, unknown>), id: String(id) };
        return store[idx] as T;
      },

      async patch(id: string | number, data: unknown): Promise<T> {
        return resource<T>(endpoint).update(id, data);
      },

      async delete(id: string | number): Promise<void> {
        await delay(300);
        const store = getStore();
        const idx = store.findIndex(i => String(i['id']) === String(id));
        if (idx !== -1) store.splice(idx, 1);
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async action(_actionName: string, _data?: unknown, _id?: string | number): Promise<T> {
        return {} as T;
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async custom(_cfg: unknown): Promise<T> {
        return {} as T;
      },
    };
  }

  return { resource } as unknown as Client;
}

// ─── Resource Definitions ──────────────────────────────────────────────────────

export const postsResource = defineResource<Post>({
  name: 'posts',
  label: 'Blog Posts',
  endpoint: '/api/posts',
  list: {
    columns: [
      { field: 'id',        label: 'ID',      sortable: true },
      { field: 'title',     label: 'Title',   sortable: true },
      { field: 'status',    label: 'Status',  type: 'badge'  },
      { field: 'author',    label: 'Author',  sortable: true },
      { field: 'createdAt', label: 'Created', type: 'date', sortable: true },
    ],
    searchable: ['title', 'author'],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    pageSize: 10,
    filters: [
      {
        field: 'status',
        label: 'Status',
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
        ],
      },
    ],
  },
  form: {
    layout: 'two-column',
    fields: [
      { field: 'title',  label: 'Title',   type: 'text',     required: true,  span: 'full' },
      { field: 'author', label: 'Author',  type: 'text',     required: true   },
      { field: 'status', label: 'Status',  type: 'select',
        options: [
          { value: 'draft',     label: 'Draft'     },
          { value: 'published', label: 'Published' },
        ],
      },
    ],
  },
  hooks: {
    beforeCreate: (data) => ({
      ...data,
      createdAt: new Date().toISOString(),
    }),
  },
});

export const usersResource = defineResource<User>({
  name: 'users',
  label: 'Users',
  endpoint: '/api/users',
  actions: ['index', 'show', 'create', 'edit'],
  list: {
    columns: [
      { field: 'id',     label: 'ID'                      },
      { field: 'name',   label: 'Name',  sortable: true   },
      { field: 'email',  label: 'Email', sortable: true   },
      { field: 'role',   label: 'Role',  type: 'badge'    },
      { field: 'active', label: 'Active', type: 'boolean' },
    ],
    searchable: ['name', 'email'],
    pageSize: 10,
  },
  form: {
    fields: [
      { field: 'name',   label: 'Full Name', type: 'text',   required: true },
      { field: 'email',  label: 'Email',     type: 'text',   required: true },
      { field: 'role',   label: 'Role',      type: 'select',
        options: [
          { value: 'admin',  label: 'Admin'  },
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
        ],
      },
      { field: 'active', label: 'Active', type: 'boolean' },
    ],
  },
});

// Register
registerResource(postsResource);
registerResource(usersResource);

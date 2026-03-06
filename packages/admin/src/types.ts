import type { z } from 'zod';
import type { ListResponse } from '@liteforge/client';
import type { Signal } from '@liteforge/core';

export type { ListResponse };

export type AdminAction = 'index' | 'show' | 'create' | 'edit' | 'destroy';

// ── Permissions ───────────────────────────────────────────────────────────────

export type PermissionValue<T> = boolean | ((record: T) => boolean);

export interface ResourcePermissions<T = Record<string, unknown>> {
  canView?: PermissionValue<T>;
  canCreate?: boolean | (() => boolean);
  canEdit?: PermissionValue<T>;
  canDestroy?: PermissionValue<T>;
}

// ── Activity Log ──────────────────────────────────────────────────────────────

export type ActivityAction = 'create' | 'update' | 'delete';

export interface ActivityEntry {
  id: string;
  resourceName: string;
  resourceLabel: string;
  action: ActivityAction;
  recordId: string | number;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'relation'
  | 'badge'
  | 'markdown'
  | 'image'
  | 'json'
  | 'custom';

export type FormLayout = 'single' | 'two-column';

export interface ColumnConfig {
  field: string;
  label: string;
  sortable?: boolean;
  type?: FieldType;
  badge?: boolean;
  renderCell?: (value: unknown, record: unknown) => Node;
}

export interface FilterConfig {
  field: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface ListConfig {
  columns: ColumnConfig[];
  searchable?: string[];
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  filters?: FilterConfig[];
}

export interface ShowConfig {
  fields?: string[];
}

export interface FormFieldConfig {
  field: string;
  label: string;
  type: FieldType;
  required?: boolean;
  span?: 'full';
  options?: Array<{ value: string; label: string }>;
  relation?: { resource: string; labelField: string };
  renderForm?: (value: () => unknown, onChange: (v: unknown) => void) => Node;
}

export interface FormConfig {
  fields: FormFieldConfig[];
  layout?: FormLayout;
}

export interface ResourceHooks<T> {
  beforeCreate?: (data: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  afterCreate?: (record: T) => void;
  beforeEdit?: (data: Partial<T>) => Partial<T> | Promise<Partial<T>>;
  afterEdit?: (record: T) => void;
  beforeDestroy?: (id: string | number) => boolean | Promise<boolean>;
  afterDestroy?: (id: string | number) => void;
}

export interface RowAction<T> {
  label: string;
  icon?: string;
  show?: (record: T) => boolean;
  action: (record: T) => Promise<void> | void;
}

export interface BulkAction<T = Record<string, unknown>> {
  label: string;
  icon?: string;
  show?: (selectedIds: (string | number)[]) => boolean;
  action: (ids: (string | number)[], records?: T[]) => Promise<void>;
}

export type DashboardWidgetType = 'count' | 'list' | 'custom';

export interface DashboardWidgetConfig<T = Record<string, unknown>> {
  type: DashboardWidgetType;
  label: string;
  resource?: ResourceDefinition<T>;
  limit?: number;
  render?: () => Node;
}

export interface DashboardConfig {
  widgets: DashboardWidgetConfig[];
}

export interface ResourceDefinition<T = Record<string, unknown>> {
  name: string;
  label: string;
  endpoint: string;
  schema: z.ZodObject<z.ZodRawShape> | undefined;
  actions: AdminAction[];
  list: ListConfig;
  show: ShowConfig | undefined;
  form: FormConfig | undefined;
  hooks: ResourceHooks<T> | undefined;
  rowActions: RowAction<T>[] | undefined;
  bulkActions: BulkAction<T>[] | undefined;
  permissions: ResourcePermissions<T> | undefined;
}

export interface DefineResourceOptions<T = Record<string, unknown>> {
  name: string;
  label?: string;
  endpoint: string;
  schema?: z.ZodObject<z.ZodRawShape>;
  actions?: AdminAction[];
  list: ListConfig;
  show?: ShowConfig;
  form?: FormConfig;
  hooks?: ResourceHooks<T>;
  rowActions?: RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  permissions?: ResourcePermissions<T>;
}

export interface AdminApi {
  navigate: (path: string) => void;
  registry: Map<string, ResourceDefinition>;
}

export interface AdminPluginOptions {
  basePath?: string;
  title?: string;
  logo?: string | (() => Node);
  unstyled?: boolean;
  logEndpoint?: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UseListResult<T> {
  data: Signal<T[]>;
  total: Signal<number>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  page: Signal<number>;
  setPage: (page: number) => void;
  sort: Signal<{ field: string; direction: 'asc' | 'desc' } | null>;
  setSort: (field: string) => void;
  search: Signal<string>;
  setSearch: (q: string) => void;
  filters: Signal<Record<string, string>>;
  setFilter: (field: string, value: string) => void;
  refresh: () => void;
}

export interface UseRecordResult<T> {
  record: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  refetch: () => void;
}

export interface UseResourceResult<T> {
  create: (data: unknown) => Promise<T>;
  update: (id: string | number, data: unknown) => Promise<T>;
  destroy: (id: string | number) => Promise<void>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
}

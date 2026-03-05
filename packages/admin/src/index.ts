// Core
export { defineResource } from './core/defineResource.js';
export { resourceRegistry, registerResource, clearRegistry } from './core/registry.js';

// Hooks
export { useList } from './hooks/useList.js';
export { useRecord } from './hooks/useRecord.js';
export { useResource } from './hooks/useResource.js';

// Router
export { buildAdminRoutes } from './router/buildAdminRoutes.js';

// Components
export { AdminLayout } from './components/AdminLayout.js';
export { DataTable } from './components/DataTable.js';
export { DetailView } from './components/DetailView.js';
export { ResourceForm } from './components/ResourceForm.js';
export { ConfirmDialog } from './components/ConfirmDialog.js';

// Plugin
export { adminPlugin } from './plugin.js';

// Styles
export { injectAdminStyles, resetStylesInjection } from './styles.js';

// Types
export type {
  AdminAction,
  FieldType,
  FormLayout,
  ColumnConfig,
  FilterConfig,
  ListConfig,
  ShowConfig,
  FormFieldConfig,
  FormConfig,
  ResourceHooks,
  RowAction,
  ResourceDefinition,
  DefineResourceOptions,
  AdminApi,
  AdminPluginOptions,
  ListParams,
  UseListResult,
  UseRecordResult,
  UseResourceResult,
} from './types.js';

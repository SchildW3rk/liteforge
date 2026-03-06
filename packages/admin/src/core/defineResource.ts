import type { DefineResourceOptions, ResourceDefinition, AdminAction } from '../types.js';

const DEFAULT_ACTIONS: AdminAction[] = ['index', 'show', 'create', 'edit', 'destroy'];

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function defineResource<T = Record<string, unknown>>(
  options: DefineResourceOptions<T>,
): ResourceDefinition<T> {
  const def: ResourceDefinition<T> = {
    name: options.name,
    label: options.label ?? capitalize(options.name),
    endpoint: options.endpoint,
    schema: options.schema ?? undefined,
    actions: options.actions ?? [...DEFAULT_ACTIONS],
    list: options.list,
    show: options.show ?? undefined,
    form: options.form ?? undefined,
    hooks: options.hooks ?? undefined,
    rowActions: options.rowActions ?? undefined,
    bulkActions: options.bulkActions ?? undefined,
    permissions: options.permissions ?? undefined,
  };
  return Object.freeze(def);
}

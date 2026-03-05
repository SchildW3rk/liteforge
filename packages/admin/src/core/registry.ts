import type { ResourceDefinition } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resourceRegistry = new Map<string, ResourceDefinition<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerResource<T = any>(def: ResourceDefinition<T>): void {
  resourceRegistry.set(def.name, def);
}

export function clearRegistry(): void {
  resourceRegistry.clear();
}

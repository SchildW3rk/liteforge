/**
 * @liteforge/client
 *
 * TypeScript-first HTTP client with resource-based CRUD,
 * interceptors, middleware, and optional @liteforge/query integration.
 */

export { createClient } from './client.js';
export { ApiError } from './errors.js';
export type {
  Client,
  QueryClient,
  ClientConfig,
  CreateClientOptions,
  CreateQueryClientOptions,
  Resource,
  QueryResource,
  ResourceOptions,
  RequestConfig,
  ResponseContext,
  InterceptorHandlers,
  Middleware,
  ListParams,
  ListResponse,
  ListMeta,
  HttpMethod,
} from './types.js';
export type { QueryIntegration } from './integrations/query.js';

// Plugin
export { clientPlugin, queryIntegration, useQueryClient } from './plugin.js';

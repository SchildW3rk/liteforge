/**
 * @liteforge/client Types
 *
 * All TypeScript interfaces and types for the HTTP client.
 */

import type { ApiError } from './errors.js';

// ============================================================================
// HTTP Primitives
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ============================================================================
// Configuration
// ============================================================================

export interface ClientConfig {
  /** Base URL for all requests (e.g. 'https://api.example.com') */
  baseUrl: string;
  /** Default headers merged into every request */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30_000) */
  timeout?: number;
  /** Number of retry attempts on network/5xx errors (default: 0) */
  retry?: number;
  /** Base delay in ms for exponential backoff (default: 300) */
  retryDelay?: number;
}

export interface RequestConfig {
  method: HttpMethod;
  /** Full URL (built from baseUrl + path by the client) */
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
  timeout?: number;
  retry?: number;
}

export interface ResponseContext<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

// ============================================================================
// Interceptors
// ============================================================================

export interface InterceptorHandlers {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: (response: ResponseContext<unknown>) => ResponseContext<unknown> | Promise<ResponseContext<unknown>>;
  onRequestError?: (error: unknown) => never | Promise<never>;
  onResponseError?: (error: ApiError) => never | Promise<never>;
}

// ============================================================================
// Middleware
// ============================================================================

export type Middleware = (
  config: RequestConfig,
  next: (config: RequestConfig) => Promise<ResponseContext>,
) => Promise<ResponseContext>;

// ============================================================================
// Resource
// ============================================================================

export interface ResourceOptions {
  /** Override URL path (default: resource name) */
  path?: string;
  /** Extra headers merged into every resource request */
  headers?: Record<string, string>;
  /** Key used as the record identifier (default: 'id') */
  idKey?: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

/**
 * Minimal shape of a query result — matches @liteforge/query's QueryResult<T>
 * without importing it (keeps this file zero-dep).
 */
export interface QueryResultShape<T> {
  data: () => T | undefined;
  error: () => Error | undefined;
  isLoading: () => boolean;
  isStale: () => boolean;
  isFetched: () => boolean;
  refetch: () => Promise<void>;
  dispose: () => void;
}

/**
 * Minimal shape of a mutation result — matches @liteforge/query's MutationResult<TData, TVariables>.
 */
export interface MutationResultShape<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: () => boolean;
  error: () => Error | undefined;
  data: () => TData | undefined;
  reset: () => void;
}

/** Base CRUD methods shared by Resource and QueryResource. */
interface ResourceBase<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  getList: (params?: ListParams) => Promise<ListResponse<T>>;
  getOne: (id: string | number) => Promise<T>;
  create: (data: TCreate) => Promise<T>;
  update: (id: string | number, data: TUpdate) => Promise<T>;
  patch: (id: string | number, data: Partial<TUpdate>) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
  action: (action: string, data?: unknown, id?: string | number) => Promise<unknown>;
  custom: <TResult>(config: Omit<RequestConfig, 'url'> & { path: string }) => Promise<TResult>;
}

/** Resource without query integration — use* methods absent. */
export interface Resource<T, TCreate = Partial<T>, TUpdate = Partial<T>>
  extends ResourceBase<T, TCreate, TUpdate> {}

/** Resource with query integration — use* methods guaranteed present. */
export interface QueryResource<T, TCreate = Partial<T>, TUpdate = Partial<T>>
  extends ResourceBase<T, TCreate, TUpdate> {
  useList: (params?: ListParams | (() => ListParams)) => QueryResultShape<ListResponse<T>>;
  useOne: (id: string | number) => QueryResultShape<T>;
  useCreate: () => MutationResultShape<T, TCreate>;
  useUpdate: () => MutationResultShape<T, { id: string | number; data: TUpdate }>;
  useDelete: () => MutationResultShape<void, string | number>;
}

// ============================================================================
// Client
// ============================================================================

/** Shared HTTP methods used by both Client and QueryClient. */
interface ClientBase {
  get: <T>(path: string, config?: Partial<RequestConfig>) => Promise<T>;
  post: <T>(path: string, body?: unknown, config?: Partial<RequestConfig>) => Promise<T>;
  put: <T>(path: string, body?: unknown, config?: Partial<RequestConfig>) => Promise<T>;
  patch: <T>(path: string, body?: unknown, config?: Partial<RequestConfig>) => Promise<T>;
  delete: <T>(path: string, config?: Partial<RequestConfig>) => Promise<T>;
  /** Add interceptor handlers. Returns a remove function. */
  addInterceptor: (handlers: InterceptorHandlers) => () => void;
  /** Add middleware. Returns a remove function. */
  use: (middleware: Middleware) => () => void;
}

/** Client without query integration — resource() returns Resource (no use* methods). */
export interface Client extends ClientBase {
  resource: <T, TCreate = Partial<T>, TUpdate = Partial<T>>(
    name: string,
    options?: ResourceOptions,
  ) => Resource<T, TCreate, TUpdate>;
}

/** Client with query integration — resource() returns QueryResource (use* methods guaranteed). */
export interface QueryClient extends ClientBase {
  resource: <T, TCreate = Partial<T>, TUpdate = Partial<T>>(
    name: string,
    options?: ResourceOptions,
  ) => QueryResource<T, TCreate, TUpdate>;
}

export interface CreateClientOptions extends ClientConfig {
  interceptors?: InterceptorHandlers[];
  middleware?: Middleware[];
}

export interface CreateQueryClientOptions extends CreateClientOptions {
  query: import('./integrations/query.js').QueryIntegration;
}

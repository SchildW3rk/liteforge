/**
 * createClient — main entry point for @liteforge/client
 */

import type {
  Client,
  QueryClient,
  CreateClientOptions,
  CreateQueryClientOptions,
  RequestConfig,
  ResponseContext,
  InterceptorHandlers,
  Middleware,
  ResourceOptions,
  Resource,
  QueryResource,
} from './types.js';
import { executeFetch } from './request.js';
import { createInterceptorRegistry } from './interceptors.js';
import { createMiddlewarePipeline } from './middleware.js';
import { createResource } from './resource.js';
import { buildUrl } from './utils/url.js';
import { mergeHeaders } from './utils/headers.js';
import { retryRequest } from './utils/retry.js';
import type { QueryIntegration } from './integrations/query.js';

type InternalOpts = (CreateClientOptions | CreateQueryClientOptions) & { query?: QueryIntegration };

export function createClient(opts: CreateQueryClientOptions): QueryClient;
export function createClient(opts: CreateClientOptions): Client;
export function createClient(opts: InternalOpts): Client | QueryClient {
  const defaultHeaders = opts.headers ?? {};
  const defaultTimeout = opts.timeout ?? 30_000;
  const defaultRetry = opts.retry ?? 0;
  const defaultRetryDelay = opts.retryDelay ?? 300;

  const interceptorRegistry = createInterceptorRegistry();
  const middlewareList: Middleware[] = [...(opts.middleware ?? [])];

  // Seed initial interceptors
  for (const h of opts.interceptors ?? []) {
    interceptorRegistry.add(h);
  }

  // Core handler (always uses current middlewareList snapshot)
  const coreHandler = (config: RequestConfig): Promise<ResponseContext> =>
    executeFetch(config);

  async function executeRequest<T>(config: RequestConfig): Promise<T> {
    // 1. Merge client-level headers
    const merged: RequestConfig = {
      ...config,
      headers: mergeHeaders(defaultHeaders, config.headers),
      timeout: config.timeout ?? defaultTimeout,
      retry: config.retry ?? defaultRetry,
    };

    // 2. Run request interceptors
    let intercepted: RequestConfig;
    try {
      intercepted = await interceptorRegistry.runRequest(merged);
    } catch (err: unknown) {
      return interceptorRegistry.runRequestError(err);
    }

    // 3. Build middleware pipeline fresh (captures current middlewareList)
    const pipeline = createMiddlewarePipeline(middlewareList, coreHandler);

    // 4. Execute with retry
    const retryCount = intercepted.retry ?? 0;
    const retryDelay = defaultRetryDelay;

    let context: ResponseContext<T>;

    try {
      context = await retryRequest(
        () => pipeline(intercepted) as Promise<ResponseContext<T>>,
        retryCount,
        retryDelay,
      );
    } catch (err: unknown) {
      // Import at runtime to avoid circular-dep issues in type-checking
      const { ApiError } = await import('./errors.js');
      if (err instanceof ApiError) {
        return interceptorRegistry.runResponseError(err) as Promise<never>;
      }
      throw err;
    }

    // 5. Run response interceptors
    const finalCtx = await interceptorRegistry.runResponse(context);

    return finalCtx.data as T;
  }

  function get<T>(path: string, config?: Partial<RequestConfig>): Promise<T> {
    return executeRequest<T>({ ...config, method: 'GET', url: buildUrl(opts.baseUrl, path) });
  }

  function post<T>(path: string, body?: unknown, config?: Partial<RequestConfig>): Promise<T> {
    return executeRequest<T>({ ...config, method: 'POST', url: buildUrl(opts.baseUrl, path), body });
  }

  function put<T>(path: string, body?: unknown, config?: Partial<RequestConfig>): Promise<T> {
    return executeRequest<T>({ ...config, method: 'PUT', url: buildUrl(opts.baseUrl, path), body });
  }

  function patch<T>(path: string, body?: unknown, config?: Partial<RequestConfig>): Promise<T> {
    return executeRequest<T>({ ...config, method: 'PATCH', url: buildUrl(opts.baseUrl, path), body });
  }

  function del<T>(path: string, config?: Partial<RequestConfig>): Promise<T> {
    return executeRequest<T>({ ...config, method: 'DELETE', url: buildUrl(opts.baseUrl, path) });
  }

  function resource<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
    name: string,
    options: ResourceOptions = {},
  ): Resource<T, TCreate, TUpdate> | QueryResource<T, TCreate, TUpdate> {
    const resourceBasePath = buildUrl(opts.baseUrl, options.path ?? name);
    const resourceOpts: ResourceOptions = { ...options, path: resourceBasePath };

    if (opts.query !== undefined) {
      return createResource<T, TCreate, TUpdate>(name, resourceOpts, executeRequest, opts.query);
    }
    return createResource<T, TCreate, TUpdate>(name, resourceOpts, executeRequest);
  }

  function addInterceptor(handlers: InterceptorHandlers): () => void {
    return interceptorRegistry.add(handlers);
  }

  function use(middleware: Middleware): () => void {
    middlewareList.push(middleware);
    return () => {
      const idx = middlewareList.indexOf(middleware);
      if (idx !== -1) middlewareList.splice(idx, 1);
    };
  }

  return { resource, get, post, put, patch, delete: del, addInterceptor, use };
}

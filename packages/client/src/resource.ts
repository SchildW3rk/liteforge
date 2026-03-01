/**
 * Resource factory for @liteforge/client
 *
 * Provides strongly-typed CRUD methods for a REST resource.
 */

import type { Resource, QueryResource, ResourceOptions, RequestConfig, ListParams, ListResponse } from './types.js';
import type { QueryIntegration } from './integrations/query.js';
import { buildQueryMethods } from './integrations/query.js';
import { buildUrl, appendQueryParams } from './utils/url.js';

export function createResource<T, TCreate, TUpdate>(
  name: string,
  options: ResourceOptions,
  request: <R>(config: RequestConfig) => Promise<R>,
  queryIntegration: QueryIntegration,
): QueryResource<T, TCreate, TUpdate>;
export function createResource<T, TCreate, TUpdate>(
  name: string,
  options: ResourceOptions,
  request: <R>(config: RequestConfig) => Promise<R>,
  queryIntegration?: undefined,
): Resource<T, TCreate, TUpdate>;
export function createResource<T, TCreate, TUpdate>(
  name: string,
  options: ResourceOptions,
  request: <R>(config: RequestConfig) => Promise<R>,
  queryIntegration?: QueryIntegration,
): Resource<T, TCreate, TUpdate> | QueryResource<T, TCreate, TUpdate> {
  const basePath = options.path ?? name;
  const extraHeaders = options.headers;

  function withHeaders(cfg: RequestConfig): RequestConfig {
    if (extraHeaders === undefined) return cfg;
    return { ...cfg, headers: { ...extraHeaders, ...cfg.headers } };
  }

  function getList(params?: ListParams): Promise<ListResponse<T>> {
    let url = basePath;
    if (params !== undefined && Object.keys(params).length > 0) {
      url = appendQueryParams(basePath, params as Record<string, string | number | boolean | undefined>);
    }
    return request<ListResponse<T>>(withHeaders({ method: 'GET', url }));
  }

  function getOne(id: string | number): Promise<T> {
    return request<T>(withHeaders({ method: 'GET', url: buildUrl(basePath, String(id)) }));
  }

  function create(data: TCreate): Promise<T> {
    return request<T>(withHeaders({ method: 'POST', url: basePath, body: data }));
  }

  function update(id: string | number, data: TUpdate): Promise<T> {
    return request<T>(
      withHeaders({ method: 'PUT', url: buildUrl(basePath, String(id)), body: data }),
    );
  }

  function patch(id: string | number, data: Partial<TUpdate>): Promise<T> {
    return request<T>(
      withHeaders({ method: 'PATCH', url: buildUrl(basePath, String(id)), body: data }),
    );
  }

  function del(id: string | number): Promise<void> {
    return request<void>(withHeaders({ method: 'DELETE', url: buildUrl(basePath, String(id)) }));
  }

  function action(actionName: string, data?: unknown, id?: string | number): Promise<unknown> {
    const url =
      id !== undefined
        ? buildUrl(buildUrl(basePath, String(id)), actionName)
        : buildUrl(basePath, actionName);
    return request<unknown>(withHeaders({ method: 'POST', url, body: data }));
  }

  function custom<TResult>(
    cfg: Omit<RequestConfig, 'url'> & { path: string },
  ): Promise<TResult> {
    const { path, ...rest } = cfg;
    return request<TResult>(withHeaders({ ...rest, url: buildUrl(basePath, path) }));
  }

  const resource: Resource<T, TCreate, TUpdate> = {
    getList,
    getOne,
    create,
    update,
    patch,
    delete: del,
    action,
    custom,
  };

  if (queryIntegration !== undefined) {
    const queryMethods = buildQueryMethods<T, TCreate, TUpdate>(
      name,       // short resource name → used as query cache key
      basePath,   // full fetch URL
      request,
      queryIntegration,
    );
    return { ...resource, ...queryMethods };
  }

  return resource;
}

/**
 * @liteforge/client — Plugin + Helpers
 *
 * One plugin, one registry key ('client' → Client).
 * For QueryClient access use the typed helper:
 *
 *   // In app setup:
 *   app.use(clientPlugin({ baseUrl: '/api', query: queryIntegration() }));
 *
 *   // In components — base client:
 *   const client = use('client');         // → Client
 *
 *   // In components — query client:
 *   const client = useQueryClient();      // → QueryClient (explicit opt-in)
 *
 * The cast lives once here, not scattered across user-code.
 */

import { use } from '@liteforge/runtime';
import type { LiteForgePlugin } from '@liteforge/runtime';
import type { Client, QueryClient, CreateClientOptions, CreateQueryClientOptions } from './types.js';
import type { QueryIntegration } from './integrations/query.js';
import { createQuery } from '@liteforge/query';
import { createMutation } from '@liteforge/query';
import { createClient } from './client.js';

// ============================================================================
// queryIntegration() — explicit integration factory, no Magic resolve()
// ============================================================================

/**
 * Creates a QueryIntegration object to wire @liteforge/query into the client.
 *
 * @example
 * app.use(clientPlugin({ baseUrl: '/api', query: queryIntegration() }));
 */
export function queryIntegration(): QueryIntegration {
  return { createQuery, createMutation };
}

// ============================================================================
// clientPlugin — one plugin, one registry key
// ============================================================================

export function clientPlugin(options: CreateQueryClientOptions): LiteForgePlugin;
export function clientPlugin(options: CreateClientOptions): LiteForgePlugin;
export function clientPlugin(options: CreateClientOptions | CreateQueryClientOptions): LiteForgePlugin {
  return {
    name: 'client',
    install(context) {
      context.provide('client', createClient(options));
    },
  };
}

// ============================================================================
// useQueryClient() — typed helper, cast lives here not in user-code
// ============================================================================

/**
 * Returns the registered client as QueryClient.
 * Only call this when clientPlugin was configured with query: queryIntegration().
 *
 * @example
 * setup({ use }) {
 *   const client = useQueryClient();
 *   const posts = client.resource<Post, NewPost>('posts');
 *   const listQuery = posts.useList();
 * }
 */
export function useQueryClient(): QueryClient {
  return use('client') as QueryClient;
}

// ============================================================================
// Declaration Merging — client: Client (never lies)
// ============================================================================

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    client: Client;
  }
}

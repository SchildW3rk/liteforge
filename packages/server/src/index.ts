export { defineServerFn } from './server-fn.js'
export { defineServerModule } from './server-module.js'
export { liteforgeServer } from './plugin.js'

// High-level fullstack facade (Phase 2 Step 1.5)
export { defineApp } from './define-app.js'
export { defineDocument, renderDocument } from './define-document.js'

export type {
  BaseCtx,
  ServerCtxRegistry,
  ResolvedCtx,
  AnyZodObject,
  ServerFn,
  ServerFnDef,
  ServerModule,
  AnyServerModule,
  AnyServerFn,
  FnsRecord,
  ModulesMap,
  LiteForgeServerOptions,
  LiteForgeServerPlugin,
  CorsOptions,
  InferServerApi,
  RpcRequest,
  RpcResponse,
  RpcSuccessResponse,
  RpcErrorResponse,
} from './types.js'

export {
  createContextPlugin,
  createServerClientLiteForgePlugin,
  composeLiteForgePlugins,
  composeLiteForgePluginsForServer,
} from './define-app.js'
export { resolveRequestContext } from './context.js'

export type {
  AppConfig,
  AppInstance,
  FullstackAppBuilder,
  OakBunPluginLike,
  AppServerCtx,
  ServerModulesContextError,
  ContextPlugin,
  ServerOf,
  CtxOf,
  BuildOptions,
  BuildResult,
  ListenOptions,
  DevOptions,
} from './define-app.js'

export type {
  DocumentConfig,
  DocumentDescriptor,
  DocumentHead,
  DocumentBody,
  DocumentMeta,
  DocumentLink,
  DocumentScript,
  RenderDocumentOptions,
} from './define-document.js'

export type { ContextMap, ResolveContext } from './context.js'

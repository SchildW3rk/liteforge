import type { z } from 'zod'

// ─── BaseCtx (minimal interface — real type comes from OakBun peer dep) ────────
// We define our own minimal interface so @liteforge/server has no hard OakBun import.
// The actual ctx flowing through handlers is the full OakBun ctx (superset of this).
export interface BaseCtx {
  req: Request
  json: <T>(data: T, status?: number) => Response
}

// ─── Zod constraint ────────────────────────────────────────────────────────────
export type AnyZodObject = z.ZodObject<z.ZodRawShape>

// ─── ServerFn ─────────────────────────────────────────────────────────────────
// Phantom-type carrier. Runtime value is just { _tag, _def }.
// _output and _ctx are undefined at runtime — they exist only for type inference.
export interface ServerFn<
  TInput extends AnyZodObject,
  TOutput,
  TCtx extends BaseCtx = BaseCtx
> {
  readonly _tag: 'ServerFn'
  readonly _input: TInput
  readonly _output: TOutput
  readonly _ctx: TCtx
  readonly _def: ServerFnDef<TInput, TOutput, TCtx>
}

export interface ServerFnDef<
  TInput extends AnyZodObject,
  TOutput,
  TCtx extends BaseCtx = BaseCtx
> {
  input: TInput
  handler: (input: z.infer<TInput>, ctx: TCtx) => Promise<TOutput> | TOutput
}

// Collection upper-bound: `any` on all three slots avoids contravariance trap.
// The handler signature (input: concrete) => concrete is not assignable to
// (input: AnyZodObject-infer) => unknown due to parameter contravariance.
// `any` disables the check for the container type only — output API types remain concrete.
export type AnyServerFn = ServerFn<any, any, any>

// ─── ServerModule ─────────────────────────────────────────────────────────────
export type FnsRecord = Record<string, AnyServerFn>

export interface ServerModule<TName extends string, TFns extends FnsRecord> {
  readonly _tag: 'ServerModule'
  readonly name: TName
  readonly fns: TFns
}

export type AnyServerModule = ServerModule<string, FnsRecord>

// ─── LiteForgeServerPlugin ────────────────────────────────────────────────────
export type ModulesMap = Record<string, AnyServerModule>

export interface LiteForgeServerOptions<TMap extends ModulesMap> {
  modules: TMap
  rpcPrefix?: string
  cors?: CorsOptions
}

export interface CorsOptions {
  origins: string[]
}

export interface LiteForgeServerPlugin<TMap extends ModulesMap> {
  readonly _tag: 'LiteForgeServerPlugin'
  readonly _modulesMap: TMap
  readonly name: string
  readonly options: LiteForgeServerOptions<TMap>
}

// ─── Type Inference ───────────────────────────────────────────────────────────
type InferFn<TFn> = TFn extends ServerFn<infer TInput, infer TOutput, any>
  ? (input: z.infer<TInput>) => Promise<TOutput>
  : never

type InferModule<TModule> = TModule extends ServerModule<string, infer TFns>
  ? { [K in keyof TFns]: InferFn<TFns[K]> }
  : never

export type InferServerApi<TPlugin extends LiteForgeServerPlugin<any>> =
  TPlugin extends LiteForgeServerPlugin<infer TMap>
    ? { [K in keyof TMap]: InferModule<TMap[K]> }
    : never

// ─── Wire types ───────────────────────────────────────────────────────────────
export interface RpcRequest {
  input: unknown
}

export interface RpcSuccessResponse<T = unknown> {
  data: T
}

export interface RpcErrorResponse {
  error: string
  details?: unknown
}

export type RpcResponse<T = unknown> = RpcSuccessResponse<T> | RpcErrorResponse

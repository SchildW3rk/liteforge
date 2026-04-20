import type { InferServerApi, LiteForgeServerPlugin, ModulesMap, RpcResponse } from './types.js'

export interface ServerClientOptions {
  rpcPrefix?: string
  onError?: (err: { status: number; message: string }) => void
}

export interface ServerClient<TApi> {
  useServer: () => TApi
}

export class RpcError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

function createProxy<TApi>(
  rpcPrefix: string,
  onError?: (err: { status: number; message: string }) => void
): TApi {
  return new Proxy({} as object, {
    get(_, moduleName: string) {
      return new Proxy({} as object, {
        get(__, fnName: string) {
          return async (input: unknown): Promise<unknown> => {
            const url = `${rpcPrefix}/${moduleName}/${fnName}`
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Liteforge-RPC': '1',
              },
              body: JSON.stringify({ input }),
            })

            const json = await res.json() as RpcResponse

            if (!res.ok || 'error' in json) {
              const message = 'error' in json ? json.error : `HTTP ${res.status}`
              const details = 'error' in json ? json.details : undefined
              const err = new RpcError(message, res.status, details)
              onError?.({ status: res.status, message })
              throw err
            }

            return json.data
          }
        },
      })
    },
  }) as TApi
}

export function serverClientPlugin<TApi>(
  options: ServerClientOptions = {}
): ServerClient<TApi> {
  const rpcPrefix = options.rpcPrefix ?? '/api/_rpc'

  return {
    useServer(): TApi {
      return createProxy<TApi>(rpcPrefix, options.onError)
    },
  }
}

// Convenience overload: infer TApi directly from the server plugin
export function serverClientPluginFromPlugin<TMap extends ModulesMap>(
  _plugin: LiteForgeServerPlugin<TMap>,
  options: ServerClientOptions = {}
): ServerClient<InferServerApi<LiteForgeServerPlugin<TMap>>> {
  return serverClientPlugin<InferServerApi<LiteForgeServerPlugin<TMap>>>(options)
}

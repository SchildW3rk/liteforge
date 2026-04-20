import type { AnyZodObject, BaseCtx, FnsRecord, ServerFn, ServerFnDef, ServerModule } from './types.js'
import { defineServerFn } from './server-fn.js'

class ServerModuleBuilder<TName extends string, TFns extends FnsRecord> {
  constructor(
    private readonly _name: TName,
    private readonly _fns: TFns
  ) {}

  serverFn<
    FName extends string,
    TInput extends AnyZodObject,
    TOutput,
    TCtx extends BaseCtx = BaseCtx
  >(
    name: FName,
    def: ServerFnDef<TInput, TOutput, TCtx>
  ): ServerModuleBuilder<TName, TFns & Record<FName, ServerFn<TInput, TOutput, TCtx>>> {
    return new ServerModuleBuilder(this._name, {
      ...this._fns,
      [name]: defineServerFn(def),
    }) as ServerModuleBuilder<TName, TFns & Record<FName, ServerFn<TInput, TOutput, TCtx>>>
  }

  build(): ServerModule<TName, TFns> {
    return {
      _tag: 'ServerModule',
      name: this._name,
      fns: this._fns,
    }
  }
}

export function defineServerModule<TName extends string>(
  name: TName
): ServerModuleBuilder<TName, Record<never, never>> {
  return new ServerModuleBuilder(name, {} as Record<never, never>)
}

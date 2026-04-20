import type { AnyZodObject, BaseCtx, ServerFn, ServerFnDef } from './types.js'

export function defineServerFn<
  TInput extends AnyZodObject,
  TOutput,
  TCtx extends BaseCtx = BaseCtx
>(def: ServerFnDef<TInput, TOutput, TCtx>): ServerFn<TInput, TOutput, TCtx> {
  return {
    _tag: 'ServerFn',
    _input: def.input,
    _output: undefined as unknown as TOutput,
    _ctx: undefined as unknown as TCtx,
    _def: def,
  }
}

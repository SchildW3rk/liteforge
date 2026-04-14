/**
 * @liteforge/form — Composable helpers
 */

import type { ZodObject, ZodRawShape } from 'zod';
import type { FormResult, FieldResult, FieldPaths, PathValue } from './types.js';

/**
 * Access a typed form field as a stable object — eliminates per-view boilerplate.
 *
 * When called with a literal path the return type is fully inferred from the schema.
 * When called with a runtime string it returns `FieldResult<unknown>`.
 *
 * @example
 * ```ts
 * setup() {
 *   const form = createForm({ schema, initial, onSubmit })
 *   const name = useField(form, 'name')   // FieldResult<string>
 *   const age  = useField(form, 'age')    // FieldResult<number>
 *   return { form, name, age }
 * }
 *
 * // In component:
 * <input value={() => name.value()} oninput={(e) => name.set(e.target.value)} onblur={name.touch} />
 * <Show when={() => !!name.error()}>{() => name.error()}</Show>
 * ```
 */
export function useField<
  TSchema extends ZodObject<ZodRawShape>,
  P extends FieldPaths<import('zod').input<TSchema>>,
>(form: FormResult<TSchema>, path: P): FieldResult<PathValue<import('zod').input<TSchema>, P>>;
export function useField<TSchema extends ZodObject<ZodRawShape>>(
  form: FormResult<TSchema>,
  path: string,
): FieldResult<unknown>;
export function useField(
  form: FormResult<ZodObject<ZodRawShape>>,
  path: string,
): FieldResult<unknown> {
  return form.field(path);
}

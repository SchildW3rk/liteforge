/**
 * LiteForge Vite Plugin Transform Adapter
 *
 * Thin adapter over @liteforge/transform for the Vite plugin.
 * All AST logic lives in @liteforge/transform.
 */

import { transformJsx, resolveTransformOptions } from '@liteforge/transform';
import type { TransformResult } from '@liteforge/transform';
import type { ResolvedPluginOptions } from './types.js';

export type { TransformResult };

/**
 * Transform JSX code — delegates to @liteforge/transform.
 */
export function transform(
  code: string,
  options: ResolvedPluginOptions,
  isDev = false
): TransformResult {
  const transformOptions = resolveTransformOptions({
    extensions: options.extensions,
    importSource: options.importSource,
    templateExtraction: options.templateExtraction,
    autoWrapProps: options.autoWrapProps,
  });
  return transformJsx(code, transformOptions, isDev);
}

/**
 * Transform JSX code — simplified API for testing.
 */
export function transformCode(
  code: string,
  importSource = '@liteforge/runtime',
  useTemplateExtraction = false
): string {
  const options = resolveTransformOptions({
    importSource,
    templateExtraction: useTemplateExtraction,
    autoWrapProps: true,
  });
  const result = transformJsx(code, options, !useTemplateExtraction);
  return result.code;
}

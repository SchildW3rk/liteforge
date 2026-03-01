/**
 * LiteForge Vite Plugin
 * 
 * Transforms JSX/TSX into LiteForge h() calls with signal-safe getter wrapping.
 * 
 * Usage:
 * ```ts
 * import liteforge from '@liteforge/vite-plugin';
 * 
 * export default defineConfig({
 *   plugins: [liteforge()]
 * });
 * ```
 */

import type { Plugin } from 'vite';
import type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';
import { resolveOptions, shouldTransform, isNodeModules } from './utils.js';
import { transform } from './transform.js';
import { appendHmrCode, hasHmrAcceptance } from './hmr.js';

// =============================================================================
// Plugin Factory
// =============================================================================

/**
 * Create the LiteForge Vite plugin
 */
export default function liteforgePlugin(options?: LiteForgePluginOptions): Plugin {
  let resolvedOptions: ResolvedPluginOptions;
  let isDev = false;

  return {
    name: 'vite-plugin-liteforge',
    enforce: 'pre',

    configResolved(config) {
      isDev = config.command === 'serve';
      resolvedOptions = resolveOptions(options, isDev);
    },

    transform(code: string, id: string) {
      // Skip node_modules
      if (isNodeModules(id)) {
        return null;
      }

      // Only transform files with matching extensions
      if (!shouldTransform(id, resolvedOptions.extensions)) {
        return null;
      }

      // Transform the code
      const result = transform(code, resolvedOptions, isDev);

      // If no JSX was found, return null (no change)
      if (!result.hasJsx) {
        return null;
      }

      // Add HMR code in dev mode
      let finalCode = result.code;
      if (isDev && resolvedOptions.hmr && !hasHmrAcceptance(finalCode)) {
        finalCode = appendHmrCode(finalCode, id);
      }

      return {
        code: finalCode,
        // Return source map or empty mappings (null can break Vite's module graph)
        map: result.map ?? { mappings: '' },
      };
    },
  };
}

// =============================================================================
// Re-exports
// =============================================================================

// Export types
export type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';

// Export transform for testing
export { transform, transformCode } from './transform.js';

// Export utilities for advanced use
export { shouldWrapExpression, isStaticExpression, wrapInGetter } from './getter-wrap.js';
export { isEventHandler, isComponent } from './utils.js';

// Export template extraction utilities for advanced use
export {
  analyzeElement,
  extractElementInfo,
  generateTemplateString,
  type ElementInfo,
  type ChildInfo,
  type TemplateAnalysis,
  type ElementClassification,
} from './template-extractor.js';
export {
  resolvePaths,
  pathToAccessor,
  type DomPath,
  type PathStep,
  type PathResolution,
} from './path-resolver.js';
export {
  compileTemplate,
  generateModuleTemplates,
  type CompiledTemplate,
} from './template-compiler.js';

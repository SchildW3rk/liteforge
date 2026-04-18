/**
 * @liteforge/transform
 *
 * Bundler-agnostic AST transform core for LiteForge.
 * Converts JSX/TSX to direct DOM operations with signal-safe reactivity.
 *
 * Usage:
 * ```ts
 * import { transformJsx, shouldTransform, resolveTransformOptions } from '@liteforge/transform'
 *
 * const options = resolveTransformOptions({ importSource: '@liteforge/runtime' })
 * const result = transformJsx(code, options, isDev)
 * ```
 */

// Primary transform API
export { transformJsx } from './transform.js';
export {
  shouldTransform,
  isNodeModules,
  resolveTransformOptions,
  mightContainJsx,
  isEventHandler,
  isComponent,
  createHImport,
} from './utils.js';

// Types
export type {
  TransformOptions,
  ResolvedTransformOptions,
  TransformResult,
  SourceMap,
  JsxTransformState,
} from './types.js';
export type { TemplateTransformState } from './template-visitor.js';

// Getter wrapping utilities (advanced use / adapters)
export {
  shouldWrapExpression,
  isStaticExpression,
  wrapInGetter,
  isLiteralValue,
  isPropsAccess,
  isFunctionCall,
  isBinaryExpression,
  isConditionalExpression,
  isMemberExpression,
  isIdentifier,
  isTemplateLiteralWithExpressions,
  isLogicalExpression,
  isUnaryExpression,
} from './getter-wrap.js';

// JSX visitor (advanced use / adapters)
export {
  createJsxVisitor,
  transformJsxElement,
  transformJsxFragment,
  getTagExpression,
  transformAttributes,
  transformAttribute,
  processAttributeValue,
  transformChildren,
  transformChild,
  processChildExpression,
  cleanJsxText,
  createHCall,
} from './jsx-visitor.js';

// Control flow transform
export { createForTransformVisitor } from './for-transform.js';

// Template visitor
export {
  createTemplateVisitor,
  hoistTemplateDeclarations,
  createTemplateImport,
  checkTemplateImports,
} from './template-visitor.js';

// Template extraction utilities (advanced use)
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

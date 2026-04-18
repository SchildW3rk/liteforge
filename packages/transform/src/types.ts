/**
 * @liteforge/transform — Type definitions
 */

// =============================================================================
// Transform Options
// =============================================================================

/**
 * Options for the LiteForge JSX transform
 */
export interface TransformOptions {
  /** File extensions to transform (default: ['.tsx', '.jsx']) */
  extensions?: string[];
  /** Import source for h() and Fragment (default: '@liteforge/runtime') */
  importSource?: string;
  /**
   * Enable template extraction optimization (default: true).
   * Template extraction clones static HTML structures instead of calling
   * createElement repeatedly — faster and produces the same output.
   * Set to false only when debugging JSX transform issues.
   */
  templateExtraction?: boolean | 'auto';
  /**
   * Automatically wrap `props.*` member accesses in JSX content position with
   * a reactive getter (default: true).
   */
  autoWrapProps?: boolean;
}

/**
 * Resolved options with defaults applied
 */
export interface ResolvedTransformOptions {
  extensions: string[];
  importSource: string;
  templateExtraction: boolean | 'auto';
  autoWrapProps: boolean;
}

// =============================================================================
// Source Map
// =============================================================================

/**
 * Source map object (compatible with Rollup/Vite and Babel)
 */
export interface SourceMap {
  version: number;
  sources: string[];
  names: string[];
  sourceRoot?: string | undefined;
  sourcesContent?: string[] | undefined;
  mappings: string;
  file?: string | undefined;
}

// =============================================================================
// Transform Result
// =============================================================================

/**
 * Result of a transform operation
 */
export interface TransformResult {
  /** The transformed code */
  code: string;
  /** Source map (if available) */
  map?: SourceMap | null;
  /** Whether JSX was found and transformed */
  hasJsx: boolean;
  /** Whether Fragment was used */
  hasFragment: boolean;
}

// =============================================================================
// Internal JSX Transform State
// =============================================================================

/**
 * State tracked during JSX transformation
 */
export interface JsxTransformState {
  /** Whether any JSX was found */
  hasJsx: boolean;
  /** Whether Fragment (<>...</>) was used */
  hasFragment: boolean;
  /** Whether h import already exists */
  hasHImport: boolean;
  /** Whether Fragment import already exists */
  hasFragmentImport: boolean;
  /** The import source to use */
  importSource: string;
  /** Auto-wrap props.* accesses in JSX content position */
  autoWrapProps: boolean;
}

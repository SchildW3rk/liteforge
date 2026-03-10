import type { DocsTranslations } from './en.js';

/**
 * Type-safe wrapper for locale definitions.
 * Ensures every translation file satisfies the canonical DocsTranslations shape.
 * Missing or extra keys will cause a TypeScript error at the call site.
 */
export function defineTranslations(t: DocsTranslations): DocsTranslations {
  return t;
}

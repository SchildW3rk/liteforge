export type {
  I18nApi,
  I18nOptions,
  I18nPluginOptions,
  InterpolationParams,
  Locale,
  LocaleLoader,
  TranslationTree,
  TranslationValue,
  ExtractKeys,
} from './types.js';
export type { I18nInstance } from './i18n.js';
export { createI18n } from './i18n.js';
export { i18nPlugin } from './plugin.js';
export { resolveKey, interpolate, resolvePlural } from './resolve.js';

/**
 * Identity wrapper for locale definitions.
 * Signals intent ("this is a locale file") and enables future validation hooks.
 * Type safety is enforced at the createI18n() call site via the inferred default type.
 *
 * @example
 * // locales/de.ts
 * import { defineLocale } from '@liteforge/i18n'
 * export default defineLocale({ greeting: 'Hallo', nav: { home: 'Startseite' } })
 */
export function defineLocale<T extends Record<string, unknown>>(t: T): T {
  return t;
}

/**
 * Type-safe wrapper for locale definitions.
 * Validates that a translation object matches the canonical shape T.
 * Missing or extra keys are caught at the call site.
 *
 * @example
 * // locales/de.ts
 * import { defineTranslations } from '@liteforge/i18n'
 * import type { AppTranslations } from './en.js'
 * export default defineTranslations<AppTranslations>({ ... })
 */
export function defineTranslations<T>(t: T): T {
  return t;
}

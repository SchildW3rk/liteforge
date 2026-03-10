export type {
  I18nApi,
  I18nOptions,
  StandaloneI18nOptions,
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
export type { I18nPluginOptions } from './plugin.js';
export { resolveKey, interpolate, resolvePlural } from './resolve.js';

/**
 * Identity wrapper for locale definitions.
 * Signals intent ("this is a locale file") and enables future validation hooks.
 * Type safety is enforced via PluginRegistry declaration merging.
 *
 * @example
 * // locales/de.ts
 * import { defineLocale } from '@liteforge/i18n'
 * export default defineLocale({ greeting: 'Hallo', nav: { home: 'Startseite' } })
 */
export function defineLocale<T extends Record<string, unknown>>(t: T): T {
  return t;
}

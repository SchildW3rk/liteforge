/**
 * @liteforge/i18n — Core i18n factory
 */

import { signal, batch } from '@liteforge/core';
import type {
  I18nApi,
  I18nOptions,
  I18nPluginOptions,
  Locale,
  LocaleLoader,
  TranslationTree,
  ExtractKeys,
} from './types.js';
import { resolveKey, interpolate, resolvePlural } from './resolve.js';

export interface I18nInstance<T extends Record<string, unknown> = Record<string, string>> extends I18nApi<T> {
  /** Internal: load translations for the given locale (used by plugin) */
  _load(locale: Locale): Promise<void>;
  /** Internal: preload fallback translations (used by plugin) */
  _loadFallback(locale: Locale): Promise<void>;
}

// ─── Overloads ────────────────────────────────────────────────────────────────

/**
 * New API — type T inferred from `default:` object.
 * @example
 * import en from './locales/en.js'
 * const { t, locale, setLocale } = createI18n({ default: en, localesDir: './locales' })
 */
export function createI18n<T extends TranslationTree>(options: I18nOptions<T>): I18nInstance<T>;

/**
 * Legacy API — explicit generic + defaultLocale + load function.
 * @deprecated Prefer createI18n({ default: en }) for automatic type inference.
 */
export function createI18n<T extends Record<string, unknown> = Record<string, string>>(
  options: I18nPluginOptions,
): I18nInstance<T>;

// ─── Implementation ───────────────────────────────────────────────────────────

export function createI18n<T extends Record<string, unknown>>(
  options: I18nOptions<TranslationTree> | I18nPluginOptions,
): I18nInstance<T> {
  // Normalize both option shapes into a single internal config
  const isNewApi = 'default' in options;

  const defaultObj: TranslationTree | undefined = isNewApi
    ? (options as I18nOptions<TranslationTree>).default
    : undefined;

  const defaultLocale: Locale = isNewApi
    ? ((options as I18nOptions<TranslationTree>).defaultLocaleKey ?? 'en')
    : (options as I18nPluginOptions).defaultLocale;

  const fallbackLocale: Locale | undefined = isNewApi
    ? (options as I18nOptions<TranslationTree>).fallback
    : (options as I18nPluginOptions).fallbackLocale;

  const persist: boolean = options.persist ?? true;
  const storageKey: string = options.storageKey ?? 'lf-locale';

  // Build the load function
  const load: LocaleLoader = (() => {
    if (isNewApi) {
      const newOpts = options as I18nOptions<TranslationTree>;
      if (newOpts.load) {
        return newOpts.load as LocaleLoader;
      }
      if (newOpts.localesDir) {
        const dir = newOpts.localesDir;
        return async (locale: Locale): Promise<TranslationTree> => {
          // Use the default object directly for the default locale — avoids a
          // redundant network request and keeps the default available immediately.
          if (defaultObj && locale === defaultLocale) {
            return defaultObj;
          }
          // Dynamic import with vite-ignore so bundlers don't try to analyse the pattern.
          const mod = await import(/* @vite-ignore */ `${dir}/${locale}.js`);
          return (mod.default ?? mod) as TranslationTree;
        };
      }
      // No localesDir and no load: return default object for every locale
      return async (_locale: Locale): Promise<TranslationTree> => defaultObj ?? {};
    }
    // Legacy API — load is required
    return (options as I18nPluginOptions).load as LocaleLoader;
  })();

  // ─── Signals ───────────────────────────────────────────────────────────────

  // Determine initial locale: prefer localStorage, fall back to defaultLocale
  let initialLocale = defaultLocale;
  if (persist && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) initialLocale = stored;
  }

  const currentLocale = signal<Locale>(initialLocale);

  // When using the new API, seed the translations signal with the default object
  // so t() is available synchronously before any async load completes.
  const initialTranslations: TranslationTree = defaultObj ?? {};
  const translations = signal<TranslationTree>(initialTranslations);
  const fallbackTranslations = signal<TranslationTree>({});

  // ─── Internals ─────────────────────────────────────────────────────────────

  async function _load(locale: Locale): Promise<void> {
    const tree = await load(locale);
    batch(() => {
      currentLocale.set(locale);
      translations.set(tree);
    });
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, locale);
    }
  }

  async function _loadFallback(locale: Locale): Promise<void> {
    try {
      const tree = await load(locale);
      fallbackTranslations.set(tree);
    } catch {
      // fallback locale failing is non-fatal
    }
  }

  async function setLocale(locale: Locale): Promise<void> {
    const loads: Promise<void>[] = [_load(locale)];
    if (fallbackLocale && fallbackLocale !== locale) {
      loads.push(_loadFallback(fallbackLocale));
    }
    await Promise.all(loads);
  }

  function t(key: ExtractKeys<T>, params?: Record<string, string | number>, count?: number): string {
    // Auto-subscribes to both signals — callers inside effects/JSX update automatically
    const tree = translations();
    const fallback = fallbackTranslations();

    const keyStr = key as string;

    let raw = resolveKey(tree, keyStr);
    if (raw === undefined && fallback) {
      raw = resolveKey(fallback, keyStr);
    }
    if (raw === undefined) return keyStr;

    if (count !== undefined) {
      raw = resolvePlural(raw, count);
    }

    return interpolate(raw, params);
  }

  return {
    locale: currentLocale,
    setLocale,
    t,
    _load,
    _loadFallback,
  } as I18nInstance<T>;
}

/**
 * @liteforge/i18n — Standalone createI18n factory
 *
 * For use outside the plugin system (e.g. tests, SSR, non-Vite environments).
 * The plugin (plugin.ts) is self-contained and does not call this.
 */

import { signal, batch } from '@liteforge/core';
import type {
  I18nApi,
  I18nOptions,
  StandaloneI18nOptions,
  Locale,
  TranslationTree,
  ExtractKeys,
} from './types.js';
import { resolveKey, interpolate, resolvePlural } from './resolve.js';

export interface I18nInstance<T extends Record<string, unknown> = Record<string, string>> extends I18nApi<T> {
  /** Internal: load translations for a locale */
  _load(locale: Locale): Promise<void>;
  /** Internal: preload fallback translations */
  _loadFallback(locale: Locale): Promise<void>;
}

// ─── Overloads ────────────────────────────────────────────────────────────────

/**
 * New API — T inferred from `default:` object, no explicit generic needed.
 * @example
 * import en from './locales/en.js'
 * const { t, locale, setLocale } = createI18n({ default: en, load })
 */
export function createI18n<T extends TranslationTree>(options: I18nOptions<T>): I18nInstance<T>;

/**
 * Legacy API — explicit generic + defaultLocale + load.
 * @deprecated Prefer createI18n({ default: en, load }) for automatic type inference.
 */
export function createI18n<T extends Record<string, unknown> = Record<string, string>>(
  options: StandaloneI18nOptions,
): I18nInstance<T>;

// ─── Implementation ───────────────────────────────────────────────────────────

export function createI18n<T extends Record<string, unknown>>(
  options: I18nOptions<TranslationTree> | StandaloneI18nOptions,
): I18nInstance<T> {
  const isNew = 'default' in options;
  const o = options as I18nOptions<TranslationTree> & StandaloneI18nOptions;

  const defaultLocale: Locale = isNew ? (o.defaultLocaleKey ?? 'en') : o.defaultLocale;
  const fallbackLocale: Locale | undefined = isNew ? o.fallback : o.fallbackLocale;
  const persist: boolean = o.persist ?? true;
  const storageKey: string = o.storageKey ?? 'lf-locale';

  const load = isNew
    ? (o.load ?? (async (_locale: Locale) => o.default ?? {} as TranslationTree))
    : o.load;

  let initialLocale: Locale = defaultLocale;
  if (persist && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) initialLocale = stored;
  }

  const currentLocale = signal<Locale>(initialLocale);
  const translations = signal<TranslationTree>(isNew ? (o.default ?? {}) : {});
  const fallbackTranslations = signal<TranslationTree>({});

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
      fallbackTranslations.set(await load(locale));
    } catch {
      // non-fatal
    }
  }

  async function setLocale(locale: Locale): Promise<void> {
    const loads: Promise<void>[] = [_load(locale)];
    if (fallbackLocale && fallbackLocale !== locale) loads.push(_loadFallback(fallbackLocale));
    await Promise.all(loads);
  }

  function t(key: ExtractKeys<T>, params?: Record<string, string | number>, count?: number): string {
    const raw0 = resolveKey(translations(), key as string) ?? resolveKey(fallbackTranslations(), key as string);
    if (raw0 === undefined) return key as string;
    const raw1 = count !== undefined ? resolvePlural(raw0, count) : raw0;
    return interpolate(raw1, params);
  }

  return { locale: currentLocale, setLocale, t, _load, _loadFallback };
}

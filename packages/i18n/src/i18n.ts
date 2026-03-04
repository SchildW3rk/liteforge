/**
 * @liteforge/i18n — Core i18n factory
 */

import { signal, batch } from '@liteforge/core';
import type { I18nApi, I18nPluginOptions, Locale, TranslationTree } from './types.js';
import { resolveKey, interpolate, resolvePlural } from './resolve.js';

export interface I18nInstance extends I18nApi {
  /** Internal: load translations for the given locale (used by plugin) */
  _load(locale: Locale): Promise<void>;
  /** Internal: preload fallback translations (used by plugin) */
  _loadFallback(locale: Locale): Promise<void>;
}

export function createI18n(options: I18nPluginOptions): I18nInstance {
  const {
    defaultLocale,
    fallbackLocale,
    load,
    persist = true,
    storageKey = 'lf-locale',
  } = options;

  // Determine initial locale: prefer localStorage, fall back to defaultLocale
  let initialLocale = defaultLocale;
  if (persist && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) initialLocale = stored;
  }

  const currentLocale = signal<Locale>(initialLocale);
  const translations = signal<TranslationTree>({});
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
      const tree = await load(locale);
      fallbackTranslations.set(tree);
    } catch {
      // fallback locale failing is non-fatal
    }
  }

  async function setLocale(locale: Locale): Promise<void> {
    const loads: Promise<void>[] = [_load(locale)];
    // Reload fallback if it differs from the new locale and is configured
    if (fallbackLocale && fallbackLocale !== locale) {
      loads.push(_loadFallback(fallbackLocale));
    }
    await Promise.all(loads);
  }

  function t(key: string, params?: Record<string, string | number>, count?: number): string {
    // Auto-subscribes to both signals — callers inside effects/JSX update automatically
    const tree = translations();
    const fallback = fallbackTranslations();

    let raw = resolveKey(tree, key);
    if (raw === undefined && fallback) {
      raw = resolveKey(fallback, key);
    }
    if (raw === undefined) return key;

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
  };
}

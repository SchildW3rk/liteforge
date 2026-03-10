/**
 * @liteforge/i18n — i18nPlugin
 *
 * Self-contained plugin — builds its own signals and i18n logic.
 * Does NOT call createI18n. createI18n is only for standalone usage.
 *
 * @example — Vite glob (recommended, zero maintenance)
 * .use(i18nPlugin({
 *   defaultLocale: 'en',
 *   locales: import.meta.glob('./locales/*.js'),
 *   persist: true,
 *   storageKey: 'my-locale',
 * }))
 *
 * @example — manual load (escape hatch for non-Vite / custom logic)
 * .use(i18nPlugin({
 *   defaultLocale: 'en',
 *   load: async (locale) => (await import(`./locales/${locale}.js`)).default,
 * }))
 */

import { signal, batch } from '@liteforge/core';
import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { resolveKey, interpolate, resolvePlural } from './resolve.js';
import type { I18nApi, Locale, TranslationTree } from './types.js';

export interface I18nPluginOptions {
  /** Key of the default locale — must match a file in the locales glob */
  defaultLocale: string;
  /**
   * Vite glob result — `import.meta.glob('./locales/*.js')`.
   * Adding a new language = create one file, nothing else needed.
   */
  locales?: Record<string, () => Promise<unknown>>;
  /**
   * Manual load function — overrides `locales` when provided.
   * Use as an escape hatch for non-Vite environments or custom fetch logic.
   */
  load?: (locale: string) => Promise<TranslationTree>;
  /**
   * Fallback locale key — used when a key is missing in the current locale.
   * Defaults to `defaultLocale`.
   */
  fallback?: string;
  /** Persist selected locale to localStorage (default: true) */
  persist?: boolean;
  /** localStorage key (default: 'lf-locale') */
  storageKey?: string;
}

export function i18nPlugin(options: I18nPluginOptions): LiteForgePlugin {
  return {
    name: 'i18n',
    async install(context: PluginContext): Promise<() => void> {
      const {
        defaultLocale,
        locales,
        load,
        fallback,
        persist = true,
        storageKey = 'lf-locale',
      } = options;

      const fallbackLocale = fallback ?? defaultLocale;

      // Derive load function from glob or explicit loader — explicit wins
      const loadFn = load ?? (async (locale: Locale): Promise<TranslationTree> => {
        if (!locales) throw new Error('[i18n] Provide either locales or load in i18nPlugin options');
        const entry = Object.entries(locales).find(([key]) => key.endsWith(`/${locale}.js`));
        if (!entry) throw new Error(`[i18n] No locale file found for "${locale}"`);
        const mod = await entry[1]() as { default: TranslationTree };
        return mod.default;
      });

      // Read persisted locale before creating signals
      let initialLocale: Locale = defaultLocale;
      if (persist && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) initialLocale = stored;
      }

      const currentLocale = signal<Locale>(initialLocale);
      const translations = signal<TranslationTree>({});
      const fallbackTranslations = signal<TranslationTree>({});

      async function doLoad(locale: Locale): Promise<void> {
        const tree = await loadFn(locale);
        batch(() => {
          currentLocale.set(locale);
          translations.set(tree);
        });
        if (persist && typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, locale);
        }
      }

      async function doLoadFallback(locale: Locale): Promise<void> {
        try {
          fallbackTranslations.set(await loadFn(locale));
        } catch {
          // non-fatal
        }
      }

      // Seed translations before mount — prevents flash of untranslated keys
      const toLoad: Promise<void>[] = [doLoad(initialLocale)];
      if (fallbackLocale !== initialLocale) toLoad.push(doLoadFallback(fallbackLocale));
      await Promise.all(toLoad);

      function t(key: string, params?: Record<string, string | number>, count?: number): string {
        const raw0 = resolveKey(translations(), key) ?? resolveKey(fallbackTranslations(), key);
        if (raw0 === undefined) return key;
        const raw1 = count !== undefined ? resolvePlural(raw0, count) : raw0;
        return interpolate(raw1, params);
      }

      async function setLocale(locale: Locale): Promise<void> {
        const loads: Promise<void>[] = [doLoad(locale)];
        if (fallbackLocale !== locale) loads.push(doLoadFallback(fallbackLocale));
        await Promise.all(loads);
      }

      const api: I18nApi<Record<string, string>> = {
        locale: currentLocale,
        setLocale,
        t,
      };
      context.provide('i18n', api);

      return () => {
        // No global state to clean up — signals GC'd with the closure
      };
    },
  };
}

// Declaration merging — use('i18n') returns I18nApi<TranslationTree> by default.
// Apps override with a typed declaration for full key inference:
//   declare module '@liteforge/runtime' {
//     interface PluginRegistry { i18n: I18nApi<AppTranslations> }
//   }
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    i18n: I18nApi<Record<string, string>>;
  }
}

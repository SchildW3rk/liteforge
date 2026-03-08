/**
 * docs i18n singleton
 *
 * Used as a module-level singleton (same pattern as themeStore) so every
 * page and component can import { t, locale, setLocale } directly without
 * needing use() injection.
 *
 * i18nPlugin in main.tsx pre-loads the default/persisted locale before mount,
 * preventing any flash of untranslated keys.
 */
import { createI18n } from 'liteforge/i18n';

export const i18n = createI18n({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  load: async (locale: string) => {
    if (locale === 'de') {
      const mod = await import('./locales/de.js');
      return mod.default;
    }
    const mod = await import('./locales/en.js');
    return mod.default;
  },
  persist: true,
  storageKey: 'lf-docs-locale',
});

export const { t, locale, setLocale } = i18n;

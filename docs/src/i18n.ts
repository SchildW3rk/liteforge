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
import en from './locales/en.js';

export const i18n = createI18n({
  default: en,
  defaultLocaleKey: 'en',
  fallback: 'en',
  localesDir: './locales',
  persist: true,
  storageKey: 'lf-docs-locale',
});

export const { t, locale, setLocale } = i18n;

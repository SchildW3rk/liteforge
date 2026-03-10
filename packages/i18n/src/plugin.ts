/**
 * @liteforge/i18n — i18nPlugin
 *
 * Async install: loads the default locale translations before the app mounts.
 * Fallback locale is loaded in parallel (non-blocking).
 */

import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { createI18n } from './i18n.js';
import type { I18nApi, I18nOptions, I18nPluginOptions, TranslationTree } from './types.js';

export function i18nPlugin(
  options: I18nOptions<TranslationTree> | I18nPluginOptions,
): LiteForgePlugin {
  return {
    name: 'i18n',
    async install(context: PluginContext): Promise<() => void> {
      const i18n = createI18n(options as I18nPluginOptions);

      const fallbackLocale = 'fallback' in options
        ? (options as I18nOptions<TranslationTree>).fallback
        : (options as I18nPluginOptions).fallbackLocale;

      // Load default (or persisted) locale — awaited to prevent FOUC
      // Load fallback in parallel (if different) — both awaited together before mount
      const loads: Promise<void>[] = [i18n._load(i18n.locale())];
      if (fallbackLocale && fallbackLocale !== i18n.locale()) {
        loads.push(i18n._loadFallback(fallbackLocale));
      }
      await Promise.all(loads);

      const api: I18nApi = {
        locale: i18n.locale,
        setLocale: i18n.setLocale,
        t: i18n.t,
      };

      context.provide('i18n', api);

      return () => {
        // No global state to clean up — signals are GC'd with the instance
      };
    },
  };
}

// Declaration Merging — augments @liteforge/runtime's PluginRegistry so that
// use('i18n') returns I18nApi without a cast.
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    i18n: I18nApi;
  }
}

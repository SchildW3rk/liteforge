/**
 * @liteforge/i18n — Types
 */

export type TranslationValue = string;
export type TranslationTree = {
  [key: string]: TranslationValue | TranslationTree;
};

export type Locale = string;

export type InterpolationParams = Record<string, string | number>;

/**
 * Recursively extract all dot-notation leaf keys from a translation object.
 *
 * @example
 * type Keys = ExtractKeys<{ nav: { app: string; core: string }; title: string }>
 * // → 'nav.app' | 'nav.core' | 'title'
 *
 * When T is the default Record<string, string>, ExtractKeys<T> resolves to
 * `string`, preserving full backward compatibility for untyped usage.
 */
export type ExtractKeys<T, Prefix extends string = ''> =
  T extends string
    ? Prefix
    : {
        [K in keyof T & string]:
          ExtractKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
      }[keyof T & string];

export interface I18nApi<T extends Record<string, unknown> = Record<string, string>> {
  /** Current locale signal accessor */
  locale(): Locale;
  /** Set locale and (re-)load translations */
  setLocale(locale: Locale): Promise<void>;
  /** Translate a dot-notation key — typed to only accept known keys when T is provided */
  t(key: ExtractKeys<T>, params?: InterpolationParams, count?: number): string;
}

export type LocaleLoader<T extends TranslationTree = TranslationTree> =
  (locale: Locale) => Promise<T>;

/**
 * New options API — type T is inferred from the `default` object.
 * No explicit generic needed at the call site.
 *
 * @example
 * import en from './locales/en.js'
 * createI18n({ default: en, fallback: 'en', localesDir: './locales' })
 */
export interface I18nOptions<T extends TranslationTree> {
  /** The default locale object — T is inferred from this value */
  default: T;
  /** Key of the default locale (used for localStorage + loader) */
  defaultLocaleKey?: Locale;
  /** Fallback locale key — used when a key is missing in the current locale */
  fallback?: Locale;
  /**
   * Directory path prefix for auto-loading locale files.
   * When set (and no manual `load` is provided), locales are loaded via:
   *   import(`${localesDir}/${locale}.js`)
   * Convention: each file must export a `defineLocale({...})` as default.
   */
  localesDir?: string;
  /** Manual load function — overrides localesDir when provided */
  load?: LocaleLoader<T>;
  /** Persist selected locale to localStorage (default: true) */
  persist?: boolean;
  /** localStorage key (default: 'lf-locale') */
  storageKey?: string;
}

/**
 * Legacy options API — still fully supported, no breaking change.
 * @deprecated Prefer I18nOptions with `default:` for automatic type inference.
 */
export interface I18nPluginOptions {
  /** Default locale to load on startup */
  defaultLocale: Locale;
  /** Fallback locale used when a key is missing in current locale */
  fallbackLocale?: Locale;
  /** Function that returns the translation tree for a given locale */
  load: LocaleLoader;
  /** Whether to persist the locale choice in localStorage (default: true) */
  persist?: boolean;
  /** localStorage key name (default: 'lf-locale') */
  storageKey?: string;
}

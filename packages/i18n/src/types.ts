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
 * Standalone createI18n options — T inferred from `default:` object.
 *
 * @example
 * import en from './locales/en.js'
 * const { t, locale, setLocale } = createI18n({ default: en, load })
 */
export interface I18nOptions<T extends TranslationTree> {
  /** The default locale object — T is inferred from this value */
  default: T;
  /** Key of the default locale (used for localStorage + loader) */
  defaultLocaleKey?: Locale;
  /** Fallback locale key — used when a key is missing in the current locale */
  fallback?: Locale;
  /** Manual load function */
  load?: LocaleLoader<T>;
  /** Persist selected locale to localStorage (default: true) */
  persist?: boolean;
  /** localStorage key (default: 'lf-locale') */
  storageKey?: string;
}

/**
 * Standalone createI18n options — legacy shape, still supported.
 * @deprecated Prefer I18nOptions with `default:` for automatic type inference.
 */
export interface StandaloneI18nOptions {
  defaultLocale: Locale;
  fallbackLocale?: Locale;
  load: LocaleLoader;
  persist?: boolean;
  storageKey?: string;
}

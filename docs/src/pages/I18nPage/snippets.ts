// No imports — pure string constants

export const INSTALL_CODE = `pnpm add @liteforge/i18n`
export const IMPORT_CODE  = `import { i18nPlugin } from '@liteforge/i18n';`

export const PLUGIN_CODE = `import en from './locales/en.js'

// Vite discovers all locale files at build time — no manual import list.
const localeModules = import.meta.glob('./locales/*.js')

const app = await createApp({ root: App, target: '#app' })
  .use(i18nPlugin({
    default: en,              // T is inferred — no explicit generic needed
    fallback: 'en',           // used when a key is missing in current locale
    load: async (locale) => {
      const mod = await localeModules[\`./locales/\${locale}.js\`]?.()
      return (mod as { default: typeof en })?.default ?? en
    },
    persist: true,            // saves to localStorage (default: true)
    storageKey: 'my-locale',  // default: 'lf-locale'
  }))
  .mount();`

export const USE_CODE = `// Inside createComponent setup():
const i18n = use<I18nApi>('i18n');

const { t, locale, setLocale } = i18n;

t('greeting')                        // 'Hello'
t('greeting', { name: 'World' })     // 'Hello, World!'
t('nav.home')                        // dot-notation for nested keys
locale()                             // 'en' — signal, auto-tracks
setLocale('de')                      // async, loads translations`

export const INTERPOLATION_CODE = `// Translation strings with placeholders
const en = {
  greeting:  'Hello, {name}!',
  itemCount: 'Showing {from}–{to} of {total} results',
  perfNote:  'Run {cmd} and navigate to {path} for live results.',
}

// Usage — second argument is the params object
t('greeting',  { name: 'René' })           // → 'Hello, René!'
t('itemCount', { from: 1, to: 20, total: 847 })  // → 'Showing 1–20 of 847 results'
t('perfNote',  { cmd: 'pnpm dev', path: '/benchmark' })

// Unknown placeholders are left as-is
t('greeting', { wrong: 'x' })  // → 'Hello, {name}!'`

export const PLURAL_CODE = `// en.ts
export default {
  items: '{count} item | {count} items',          // 2-part: singular | plural
  messages: 'No messages | {count} message | {count} messages', // 3-part
};

// Usage:
t('items',    { count: 1 }, 1)  // '1 item'
t('items',    { count: 5 }, 5)  // '5 items'
t('messages', { count: 0 }, 0)  // 'No messages'
t('messages', { count: 1 }, 1)  // '1 message'
t('messages', { count: 7 }, 7)  // '7 messages'`

export const PLURAL_DETAIL_CODE = `// Two-part: "singular | plural"  (1 → singular, else → plural)
const en = {
  item:      'item | items',
  message:   '{count} message | {count} messages',
}

t('item', {}, 1)   // → 'item'
t('item', {}, 5)   // → 'items'

// Combine with interpolation
t('message', { count: 1 }, 1)   // → '1 message'
t('message', { count: 5 }, 5)   // → '5 messages'

// Three-part: "zero | one | many"  (0, 1, else)
const en2 = {
  results: 'No results | One result | {count} results',
}

t('results', { count: 0 }, 0)   // → 'No results'
t('results', { count: 1 }, 1)   // → 'One result'
t('results', { count: 42 }, 42) // → '42 results'`

export const FALLBACK_CODE = `// de.ts — 'nav.home' is missing
export default { greeting: 'Hallo, {name}!' };

// en.ts — fallback
export default { greeting: 'Hello, {name}!', nav: { home: 'Home' } };

// When locale is 'de':
t('nav.home')   // → 'Home' (falls back to en)
t('greeting')   // → 'Hallo, {name}!'  (found in de)`

export const FALLBACK_DETAIL_CODE = `import en from './locales/en.js'

const i18n = createI18n({
  default: en,          // seeds t() synchronously + infers type T
  fallback: 'en',       // used when a key is missing in the current locale
  load: async (locale) => {
    if (locale === 'de') return (await import('./locales/de.js')).default;
    return en;
  },
})

// de.ts is missing 'beta.feature' — en.ts has it
// → t('beta.feature') returns the English string, not undefined or the key
// → No runtime errors, no visible breakage`

export const LOCALE_FILE_CODE = `// locales/en.ts — source of truth, defines the type
import { defineLocale } from '@liteforge/i18n'

const en = defineLocale({
  greeting: 'Hello, {name}!',
  nav: {
    home: 'Home',
    settings: 'Settings',
  },
  items: '{count} item | {count} items',
})

export type AppTranslations = typeof en  // canonical type for all other locales
export default en

// locales/de.ts — zero imports, zero type annotations
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({
  greeting: 'Hallo, {name}!',
  nav: {
    home: 'Startseite',
    settings: 'Einstellungen',
  },
  items: '{count} Eintrag | {count} Einträge',
})`

export const LIVE_CODE = `const i18n = use<I18nApi>('i18n');
const { t, locale, setLocale } = i18n;

// locale() is a signal — auto-subscribes
<p>{() => t('greeting', { name: 'World' })}</p>
<p>{() => t('items', { count: itemCount() }, itemCount())}</p>

<button onclick={() => setLocale('de')}>🇩🇪 Deutsch</button>`

export const DEFINE_LOCALE_CODE = `// locales/fr.ts — adding French takes exactly one file
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({
  greeting: 'Bonjour, {name}!',
  nav: {
    home: 'Accueil',
    settings: 'Paramètres',
  },
  items: '{count} élément | {count} éléments',
})

// That's it. No type annotations, no changes to i18n.ts.
// import.meta.glob('./locales/*.js') picks it up automatically.`

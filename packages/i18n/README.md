# @liteforge/i18n

Signals-based i18n plugin for LiteForge. Lazy-loaded locale files, dot-notation keys, `{param}` interpolation, pipe-based pluralization, fallback locale, and localStorage persistence. No re-render on locale switch — only the text nodes that call `t()` update.

## Install

```bash
pnpm add @liteforge/i18n
```

## Quick start

```ts
// main.ts
import { createApp } from 'liteforge'
import { i18nPlugin } from '@liteforge/i18n'
import en from './locales/en.js'

await createApp({ root: App, target: '#app' })
  .use(i18nPlugin({
    default: en,              // T inferred — no explicit generic needed
    fallback: 'en',
    localesDir: './locales',  // auto-loads ./locales/{locale}.js on setLocale()
    persist: true,
  }))
  .mount()
```

```ts
// locales/en.ts — source of truth
import type { TranslationTree } from '@liteforge/i18n'

const en = {
  greeting: 'Hello, {name}!',
  nav: { home: 'Home', about: 'About' },
  items: '{count} item | {count} items',
} satisfies TranslationTree

export type AppTranslations = typeof en
export default en
```

```ts
// locales/de.ts — zero imports, zero type annotations
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({
  greeting: 'Hallo, {name}!',
  nav: { home: 'Startseite', about: 'Über uns' },
  items: '{count} Eintrag | {count} Einträge',
})
```

## Adding a language

Create one file. Done.

```ts
// locales/fr.ts
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({
  greeting: 'Bonjour, {name}!',
  nav: { home: 'Accueil', about: 'À propos' },
  items: '{count} élément | {count} éléments',
})
```

No changes to `main.ts`, no imports to update. `localesDir: './locales'` picks it up automatically when `setLocale('fr')` is called.

## Usage in components

```ts
import type { I18nApi } from '@liteforge/i18n'
import { createComponent } from 'liteforge'

export const MyComponent = createComponent({
  name: 'MyComponent',
  setup({ use }) {
    const { t, locale, setLocale } = use<I18nApi>('i18n')
    return { t, locale, setLocale }
  },
  component({ setup: { t, locale, setLocale } }) {
    return (
      <div>
        <p>{() => t('greeting', { name: 'World' })}</p>
        <button onclick={() => setLocale('de')}>Deutsch</button>
        <span>{() => locale()}</span>
      </div>
    )
  },
})
```

Or as a module-level singleton (no `use()` needed):

```ts
// i18n.ts
import { createI18n } from '@liteforge/i18n'
import en from './locales/en.js'

export const { t, locale, setLocale } = createI18n({
  default: en,
  localesDir: './locales',
})
```

## `defineLocale()`

Identity wrapper for locale definitions. Signals intent and keeps all locale files uniform. Type safety is enforced at the `createI18n()` call site via the inferred `default` type.

```ts
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({ ... })
```

## Interpolation

```ts
const en = {
  greeting: 'Hello, {name}!',
  range: 'Showing {from}–{to} of {total}',
}

t('greeting', { name: 'René' })                   // → 'Hello, René!'
t('range',    { from: 1, to: 20, total: 847 })    // → 'Showing 1–20 of 847'
```

## Pluralization

Pipe-separated strings. Two-part = `singular | plural`. Three-part = `zero | one | many`.

```ts
const en = {
  item:    '{count} item | {count} items',
  results: 'No results | One result | {count} results',
}

t('item',    { count: 1 }, 1)   // → '1 item'
t('item',    { count: 5 }, 5)   // → '5 items'
t('results', { count: 0 }, 0)   // → 'No results'
t('results', { count: 1 }, 1)   // → 'One result'
t('results', { count: 9 }, 9)   // → '9 results'
```

## Fallback locale

Missing keys fall back automatically — no silent `undefined`.

```ts
// de.ts is missing 'nav.settings'
t('nav.settings')  // → returns the English string
```

## API

### `i18nPlugin(options)` / `createI18n(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default` | `T` | — | Default locale object — **T is inferred from this** |
| `defaultLocaleKey` | `string` | `'en'` | Key of the default locale for loader routing |
| `fallback` | `string` | — | Fallback locale key — used when a key is missing |
| `localesDir` | `string` | — | Auto-load locale files: `` import(`${localesDir}/${locale}.js`) `` |
| `load` | `(locale: string) => Promise<T>` | — | Manual loader — overrides `localesDir` |
| `persist` | `boolean` | `true` | Persist locale choice to localStorage |
| `storageKey` | `string` | `'lf-locale'` | localStorage key |

> **Note on `localesDir`:** Dynamic import paths require `/* @vite-ignore */` internally. The bundler won't pre-bundle locale files — they are loaded on demand at runtime.

### `I18nApi`

| Method | Type | Description |
|--------|------|-------------|
| `locale()` | `() => string` | Signal — current locale, auto-subscribes in effects/JSX |
| `setLocale(locale)` | `(locale: string) => Promise<void>` | Load translations and update signal atomically |
| `t(key, params?, count?)` | `string` | Translate a dot-notation key with optional interpolation and pluralization |

## Migration from v1 (legacy API)

The old API still works — no breaking change:

```ts
// Still valid — deprecated but supported
createI18n<AppTranslations>({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  load: async (locale) => {
    if (locale === 'de') return (await import('./locales/de.js')).default
    return (await import('./locales/en.js')).default
  },
})
```

## License

MIT

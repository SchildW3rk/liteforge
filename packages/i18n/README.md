# @liteforge/i18n

Signals-based i18n plugin for LiteForge. Lazy-loaded locale files, dot-notation keys, `{param}` interpolation, pipe-based pluralization, fallback locale, and localStorage persistence. No re-render on locale switch — only the text nodes that call `t()` update.

## Install

```bash
pnpm add @liteforge/i18n
```

## Setup

```ts
import { createApp } from 'liteforge';
import { i18nPlugin } from 'liteforge/i18n';

await createApp({ root: App, target: '#app' })
  .use(i18nPlugin({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    load: async (locale) => {
      const mod = await import(`./locales/${locale}.js`);
      return mod.default;
    },
    persist: true,          // save to localStorage (default: true)
    storageKey: 'my-locale', // default: 'lf-locale'
  }))
  .mount();
```

## Usage

```ts
import type { I18nApi } from 'liteforge/i18n';
import { createComponent } from 'liteforge';

export const MyComponent = createComponent({
  name: 'MyComponent',
  setup({ use }) {
    const { t, locale, setLocale } = use<I18nApi>('i18n');
    return { t, locale, setLocale };
  },
  component({ setup: { t, locale, setLocale } }) {
    return (
      <div>
        <p>{() => t('greeting', { name: 'World' })}</p>
        <button onclick={() => setLocale('de')}>Deutsch</button>
      </div>
    );
  },
});
```

## Locale files

### Basic structure

```ts
// locales/en.ts
export const en = {
  greeting: 'Hello, {name}!',
  nav: {
    home: 'Home',
    about: 'About',
  },
  items: '{count} item | {count} items',
};

export type AppTranslations = typeof en;
export default en;
```

### Type-safe locale definitions with `defineTranslations()`

Instead of repeating `import type` and `satisfies` in every locale file, create a small wrapper once:

```ts
// locales/define.ts
import type { AppTranslations } from './en.js';

/**
 * Type-safe wrapper for locale definitions.
 * Missing or extra keys are caught at the defineTranslations() call site.
 */
export function defineTranslations(t: AppTranslations): AppTranslations {
  return t;
}
```

Then each locale file is just:

```ts
// locales/de.ts
import { defineTranslations } from './define.js';

export default defineTranslations({
  greeting: 'Hallo, {name}!',
  nav: {
    home: 'Startseite',
    about: 'Über uns',
  },
  items: '{count} Eintrag | {count} Einträge',
});
```

**Why this pattern?**

- No `satisfies DocsTranslations` — TypeScript checks at the call site instead
- No `import type { AppTranslations }` in every locale file — the import lives once in `define.ts`
- Scales well: adding a new locale is a single `import { defineTranslations }` line
- Missing key → TypeScript error immediately at the `defineTranslations()` call, not at the consumer

## Interpolation

Embed dynamic values with `{placeholder}` syntax:

```ts
const en = {
  greeting:  'Hello, {name}!',
  itemCount: 'Showing {from}–{to} of {total} results',
};

t('greeting',  { name: 'René' })                    // → 'Hello, René!'
t('itemCount', { from: 1, to: 20, total: 847 })     // → 'Showing 1–20 of 847 results'
```

## Pluralization

Pipe-separated strings. Two-part = `singular | plural`. Three-part = `zero | one | many`.

```ts
const en = {
  item:     '{count} item | {count} items',
  results:  'No results | One result | {count} results',
};

t('item',    { count: 1 }, 1)   // → '1 item'
t('item',    { count: 5 }, 5)   // → '5 items'
t('results', { count: 0 }, 0)   // → 'No results'
t('results', { count: 1 }, 1)   // → 'One result'
t('results', { count: 9 }, 9)   // → '9 results'
```

## Fallback locale

When a key is missing in the current locale, the plugin automatically returns the fallback locale's value. No silent `undefined`.

```ts
// de.ts is missing 'nav.settings'
t('nav.settings')  // → returns the English string automatically
```

## API

### `i18nPlugin(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultLocale` | `string` | — | Locale loaded on startup (or from localStorage) |
| `fallbackLocale` | `string` | — | Used when a key is missing in the current locale |
| `load` | `(locale: string) => Promise<TranslationTree>` | — | Async loader — return the raw translation object |
| `persist` | `boolean` | `true` | Save locale choice to localStorage |
| `storageKey` | `string` | `'lf-locale'` | localStorage key for persistence |

### `I18nApi`

| Method | Type | Description |
|--------|------|-------------|
| `locale()` | `() => string` | Signal — current locale, auto-subscribes in effects/JSX |
| `setLocale(locale)` | `(locale: string) => Promise<void>` | Load translations and update signal atomically |
| `t(key, params?, count?)` | `string` | Translate a dot-notation key with optional interpolation and pluralization |

## License

MIT

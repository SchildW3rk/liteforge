import { createComponent, signal, use } from 'liteforge';
import { createI18n, defineLocale } from 'liteforge/i18n';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

// ─── Translations ──────────────────────────────────────────────────────────────

const EN = defineLocale({
  greeting: 'Hello, {name}!',
  items: '{count} item | {count} items',
  nav: { home: 'Home', settings: 'Settings' },
  fallback: 'I only exist in English',
});

const DE = defineLocale({
  greeting: 'Hallo, {name}!',
  items: '{count} Element | {count} Elemente',
  nav: { home: 'Startseite', settings: 'Einstellungen' },
  // 'fallback' key intentionally missing — falls back to EN
});

// ─── Live example ──────────────────────────────────────────────────────────────

const I18nExample = createComponent({
  name: 'I18nExample',
  setup() {
    const i18n = createI18n({
      default: EN,
      fallback: 'en',
      load: async (locale): Promise<typeof EN> => (locale === 'de' ? DE as typeof EN : EN),
      persist: false,
    });
    const count = signal(1);
    void i18n._load('en');
    return { i18n, count };
  },
  component({ setup }) {
    const { i18n, count } = setup;
    const { t, locale, setLocale } = i18n;

    const row = (label: string, value: () => string) => (
      <div class="flex gap-2 items-baseline text-sm font-mono">
        <span class="text-[--content-muted] shrink-0">{label}</span>
        <span class="text-[--content-primary]">{value()}</span>
      </div>
    );

    return (
      <div class="space-y-4">
        {/* Locale buttons */}
        <div class="flex gap-2">
          <button
            class={() => btnClass(locale() === 'en' ? 'primary' : 'secondary', 'sm')}
            onclick={() => void setLocale('en')}
          >
            🇬🇧 English
          </button>
          <button
            class={() => btnClass(locale() === 'de' ? 'primary' : 'secondary', 'sm')}
            onclick={() => void setLocale('de')}
          >
            🇩🇪 Deutsch
          </button>
        </div>

        {/* Counter */}
        <div class="flex items-center gap-2">
          <button
            class={btnClass('secondary', 'sm', 'w-7 h-7 px-0!')}
            onclick={() => count.update(n => Math.max(0, n - 1))}
          >
            −
          </button>
          <button
            class={btnClass('secondary', 'sm', 'w-7 h-7 px-0!')}
            onclick={() => count.update(n => n + 1)}
          >
            +
          </button>
          <span class="text-xs text-[--content-muted] font-mono">
            {() => `count = ${count()}`}
          </span>
        </div>

        {/* Output rows */}
        {row("t('greeting', { name: 'World' })  →", () => t('greeting', { name: 'World' }))}
        {row("t('items', { count }, count)       →", () => t('items', { count: count() }, count()))}
        {row("t('nav.home')                      →", () => t('nav.home'))}
        {row("t('fallback')  [fallback locale]   →", () => t('fallback'))}
      </div>
    );
  },
});

// ─── Code strings ──────────────────────────────────────────────────────────────

const INSTALL_CODE = `pnpm add @liteforge/i18n`;
const IMPORT_CODE  = `import { i18nPlugin } from 'liteforge/i18n';`;

const PLUGIN_CODE = `import en from './locales/en.js'

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
  .mount();`;

const USE_CODE = `// Inside createComponent setup():
const i18n = use<I18nApi>('i18n');

const { t, locale, setLocale } = i18n;

t('greeting')                        // 'Hello'
t('greeting', { name: 'World' })     // 'Hello, World!'
t('nav.home')                        // dot-notation for nested keys
locale()                             // 'en' — signal, auto-tracks
setLocale('de')                      // async, loads translations`;

const INTERPOLATION_CODE = `// Translation strings with placeholders
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
t('greeting', { wrong: 'x' })  // → 'Hello, {name}!'`;

const PLURAL_CODE = `// en.ts
export default {
  items: '{count} item | {count} items',          // 2-part: singular | plural
  messages: 'No messages | {count} message | {count} messages', // 3-part
};

// Usage:
t('items',    { count: 1 }, 1)  // '1 item'
t('items',    { count: 5 }, 5)  // '5 items'
t('messages', { count: 0 }, 0)  // 'No messages'
t('messages', { count: 1 }, 1)  // '1 message'
t('messages', { count: 7 }, 7)  // '7 messages'`;

const PLURAL_DETAIL_CODE = `// Two-part: "singular | plural"  (1 → singular, else → plural)
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
t('results', { count: 42 }, 42) // → '42 results'`;

const FALLBACK_CODE = `// de.ts — 'nav.home' is missing
export default { greeting: 'Hallo, {name}!' };

// en.ts — fallback
export default { greeting: 'Hello, {name}!', nav: { home: 'Home' } };

// When locale is 'de':
t('nav.home')   // → 'Home' (falls back to en)
t('greeting')   // → 'Hallo, {name}!'  (found in de)`;

const FALLBACK_DETAIL_CODE = `import en from './locales/en.js'

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
// → No runtime errors, no visible breakage`;

const LOCALE_FILE_CODE = `// locales/en.ts — source of truth, defines the type
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
})`;

const LIVE_CODE = `const i18n = use<I18nApi>('i18n');
const { t, locale, setLocale } = i18n;

// locale() is a signal — auto-subscribes
<p>{() => t('greeting', { name: 'World' })}</p>
<p>{() => t('items', { count: itemCount() }, itemCount())}</p>

<button onclick={() => setLocale('de')}>🇩🇪 Deutsch</button>`;

const DEFINE_LOCALE_CODE = `// locales/fr.ts — adding French takes exactly one file
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
// import.meta.glob('./locales/*.js') picks it up automatically.`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export const I18nPage = createComponent({
  name: 'I18nPage',
  component() {
    const { t } = use('i18n');

    const getOptionsApi = (): ApiRow[] => [
      { name: 'default',       type: 'T',                                             description: t('i18n.apiDefault') },
      { name: 'fallback',      type: 'string',                        default: '—',   description: t('i18n.apiFallbackLocale') },
      { name: 'localesDir',    type: 'string',                        default: '—',   description: t('i18n.apiLocalesDir') },
      { name: 'load',          type: '(locale: string) => Promise<T>', default: '—',  description: t('i18n.apiLoad') },
      { name: 'persist',       type: 'boolean',                       default: 'true', description: t('i18n.apiPersist') },
      { name: 'storageKey',    type: 'string',                        default: "'lf-locale'", description: t('i18n.apiStorageKey') },
    ];

    const getApiApi = (): ApiRow[] => [
      { name: 'locale()',             type: '() => string',                    description: t('i18n.apiLocale') },
      { name: 'setLocale(locale)',    type: '(locale: string) => Promise<void>', description: t('i18n.apiSetLocale') },
      { name: 't(key, params?, count?)', type: 'string',                       description: t('i18n.apiT') },
    ];

    setToc([
      { id: 'setup',               label: () => t('i18n.setup'),          level: 2 },
      { id: 'usage',               label: () => t('i18n.usage'),          level: 2 },
      { id: 'locale-files',        label: () => t('i18n.localeFiles'),    level: 2 },
      { id: 'add-locale',          label: () => t('i18n.addLocale'),      level: 2 },
      { id: 'interpolation',       label: () => t('i18n.interpolation'),  level: 2 },
      { id: 'pluralization-detail', label: () => t('i18n.pluralization'), level: 2 },
      { id: 'fallback-detail',     label: () => t('i18n.fallback'),       level: 2 },
      { id: 'live',                label: () => t('i18n.live'),           level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/i18n</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">{() => t('i18n.title')}</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            {() => t('i18n.subtitlePre')} <code class="text-xs font-mono">t()</code> {() => t('i18n.subtitleSuffix')}
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title={() => t('i18n.setup')}
          id="setup"
          description={() => t('i18n.setupDesc')}
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={() => getOptionsApi()} />
        </DocSection>

        <DocSection
          title={() => t('i18n.usage')}
          id="usage"
          description={() => t('i18n.usageDesc')}
        >
          <CodeBlock code={USE_CODE} language="typescript" />
          <ApiTable rows={() => getApiApi()} />
        </DocSection>

        <DocSection
          title={() => t('i18n.localeFiles')}
          id="locale-files"
          description={() => t('i18n.localeFilesDesc')}
        >
          <CodeBlock code={LOCALE_FILE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.addLocale')}
          id="add-locale"
          description={() => t('i18n.addLocaleDesc')}
        >
          <CodeBlock code={DEFINE_LOCALE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.plural')}
          id="pluralization"
          description={() => t('i18n.pluralDesc')}
        >
          <CodeBlock code={PLURAL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.fallback')}
          id="fallback"
          description={() => t('i18n.fallbackDesc')}
        >
          <CodeBlock code={FALLBACK_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.interpolation')}
          id="interpolation"
          description={() => t('i18n.interpolationDesc')}
        >
          <CodeBlock code={INTERPOLATION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.pluralization')}
          id="pluralization-detail"
          description={() => t('i18n.pluralizationDesc')}
        >
          <CodeBlock code={PLURAL_DETAIL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.fallback')}
          id="fallback-detail"
          description={() => t('i18n.fallbackDesc')}
        >
          <CodeBlock code={FALLBACK_DETAIL_CODE} language="typescript" />
        </DocSection>

        <div class="mt-8 p-4 border border-[var(--line-default)] bg-[var(--surface-raised)]/50" style="border-radius: var(--lf-radius)">
          <p class="text-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">{() => t('i18n.vsParaglide')}</p>
          <p class="text-sm text-[var(--content-muted)]">{() => t('i18n.vsParaglideDesc')}</p>
        </div>

        <DocSection
          title={() => t('i18n.live')}
          id="live"
          description={() => t('i18n.liveDesc')}
        >
          <LiveExample
            title={() => t('i18n.liveTitle')}
            component={I18nExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});

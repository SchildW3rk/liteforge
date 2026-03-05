import { createComponent, signal } from 'liteforge';
import { createI18n } from 'liteforge/i18n';
import type { TranslationTree } from 'liteforge/i18n';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Translations ──────────────────────────────────────────────────────────────

const EN: TranslationTree = {
  greeting: 'Hello, {name}!',
  items: '{count} item | {count} items',
  nav: { home: 'Home', settings: 'Settings' },
  fallback: 'I only exist in English',
};

const DE: TranslationTree = {
  greeting: 'Hallo, {name}!',
  items: '{count} Element | {count} Elemente',
  nav: { home: 'Startseite', settings: 'Einstellungen' },
  // 'fallback' key intentionally missing — falls back to EN
};

// ─── Live example ──────────────────────────────────────────────────────────────

const I18nExample = createComponent({
  name: 'I18nExample',
  setup() {
    const i18n = createI18n({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      load: async (locale) => (locale === 'de' ? DE : EN),
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

const PLUGIN_CODE = `const app = await createApp({ root: App, target: '#app' })
  .use(i18nPlugin({
    defaultLocale: 'en',
    fallbackLocale: 'en',      // used when a key is missing in current locale
    load: async (locale) => {
      const mod = await import(\`./locales/\${locale}.js\`);
      return mod.default;      // TranslationTree (plain object)
    },
    persist: true,             // saves to localStorage (default: true)
    storageKey: 'my-locale',   // default: 'lf-locale'
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

const FALLBACK_CODE = `// de.ts — 'nav.home' is missing
export default { greeting: 'Hallo, {name}!' };

// en.ts — fallback
export default { greeting: 'Hello, {name}!', nav: { home: 'Home' } };

// When locale is 'de':
t('nav.home')   // → 'Home' (falls back to en)
t('greeting')   // → 'Hallo, {name}!'  (found in de)`;

const LOCALE_FILE_CODE = `// locales/en.ts
export default {
  greeting: 'Hello, {name}!',
  nav: {
    home: 'Home',
    settings: 'Settings',
  },
  items: '{count} item | {count} items',
} satisfies TranslationTree;`;

const LIVE_CODE = `const i18n = use<I18nApi>('i18n');
const { t, locale, setLocale } = i18n;

// locale() is a signal — auto-subscribes
<p>{() => t('greeting', { name: 'World' })}</p>
<p>{() => t('items', { count: itemCount() }, itemCount())}</p>

<button onclick={() => setLocale('de')}>🇩🇪 Deutsch</button>`;

// ─── API rows ──────────────────────────────────────────────────────────────────

const OPTIONS_API: ApiRow[] = [
  { name: 'defaultLocale',  type: 'string',                                      description: 'Locale loaded on startup (or from localStorage if persist: true)' },
  { name: 'fallbackLocale', type: 'string',                       default: '—',  description: 'Loaded in parallel; used when a key is missing in the current locale' },
  { name: 'load',           type: '(locale: string) => Promise<TranslationTree>', description: 'Async loader — return the raw translation object for the given locale' },
  { name: 'persist',        type: 'boolean',                      default: 'true', description: 'Save locale choice to localStorage; restore on next visit' },
  { name: 'storageKey',     type: 'string',                       default: "'lf-locale'", description: 'localStorage key used for persistence' },
];

const API_API: ApiRow[] = [
  { name: 'locale()',             type: '() => string',                    description: 'Signal — current locale. Auto-subscribes callers inside effects / JSX.' },
  { name: 'setLocale(locale)',    type: '(locale: string) => Promise<void>', description: 'Load translations for the new locale, update signal atomically via batch()' },
  { name: 't(key, params?, count?)', type: 'string',                       description: 'Translate a dot-notation key. Supports {param} interpolation and | pipe pluralization.' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const I18nPage = createComponent({
  name: 'I18nPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/i18n</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">Internationalization</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            Signals-based i18n plugin. Lazy-loaded locale files, dot-notation keys,
            interpolation, pipe-based pluralization, fallback locale, and localStorage persistence.
            No re-render on locale switch — only the text nodes that read <code class="text-xs font-mono">t()</code> update.
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title="Plugin setup"
          id="setup"
          description="Register i18nPlugin before .mount() — it awaits the initial locale before the app renders, preventing any flash of untranslated keys."
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={OPTIONS_API} />
        </DocSection>

        <DocSection
          title="Using translations"
          id="usage"
          description="Access the i18n API via use('i18n') in any component's setup(). t() is a plain function — wrap it in () => for reactive JSX."
        >
          <CodeBlock code={USE_CODE} language="typescript" />
          <ApiTable rows={API_API} />
        </DocSection>

        <DocSection
          title="Locale files"
          id="locale-files"
          description="Translation trees are plain TypeScript objects — no special format, no CLI needed. Use satisfies TranslationTree for type checking."
        >
          <CodeBlock code={LOCALE_FILE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Pluralization"
          id="pluralization"
          description="Pipe-separated strings. 2 parts = singular|plural. 3 parts = zero|one|many. Pass count as the third argument to t()."
        >
          <CodeBlock code={PLURAL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Fallback locale"
          id="fallback"
          description="Missing keys in the current locale transparently fall back to the fallback locale. The fallback is loaded in parallel at startup."
        >
          <CodeBlock code={FALLBACK_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Live example"
          id="live"
          description="Click the locale buttons — only the bound text nodes update, no component re-render."
        >
          <LiveExample
            title="Locale switch · interpolation · pluralization · fallback"
            component={I18nExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});

import { createComponent, signal } from 'liteforge';
import { createI18n } from 'liteforge/i18n';
import type { TranslationTree } from 'liteforge/i18n';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { btnClass } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';
import { t } from '../i18n.js';

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

function getOptionsApi(): ApiRow[] { return [
  { name: 'defaultLocale',  type: 'string',                                      description: t('i18n.apiDefaultLocale') },
  { name: 'fallbackLocale', type: 'string',                       default: '—',  description: t('i18n.apiFallbackLocale') },
  { name: 'load',           type: '(locale: string) => Promise<TranslationTree>', description: t('i18n.apiLoad') },
  { name: 'persist',        type: 'boolean',                      default: 'true', description: t('i18n.apiPersist') },
  { name: 'storageKey',     type: 'string',                       default: "'lf-locale'", description: t('i18n.apiStorageKey') },
]; }

function getApiApi(): ApiRow[] { return [
  { name: 'locale()',             type: '() => string',                    description: t('i18n.apiLocale') },
  { name: 'setLocale(locale)',    type: '(locale: string) => Promise<void>', description: t('i18n.apiSetLocale') },
  { name: 't(key, params?, count?)', type: 'string',                       description: t('i18n.apiT') },
]; }

// ─── Page ──────────────────────────────────────────────────────────────────────

export const I18nPage = createComponent({
  name: 'I18nPage',
  component() {
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

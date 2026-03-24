import { createComponent, signal } from 'liteforge';
import { createI18n, defineLocale } from '@liteforge/i18n';
import { btnClass } from '../../components/Button.js';

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

export const I18nExample = createComponent({
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

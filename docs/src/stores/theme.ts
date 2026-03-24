import { defineStore } from '@liteforge/store';

const STORAGE_KEY = 'lf-docs-theme';

function resolveInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

export const themeStore = defineStore('docs-theme', {
  state: {
    dark: false,
  },
  getters: (state) => ({
    isDark: () => state.dark(),
    label: () => state.dark() ? '☀ Light' : '☾ Dark',
  }),
  actions: (state) => ({
    toggle() {
      const next = !state.dark();
      state.dark.set(next);
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    },
    setDark(value: boolean) {
      state.dark.set(value);
      applyTheme(value);
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    },
  }),
});

/** Call once before the app mounts to sync the DOM with the stored preference. */
export function initTheme(): void {
  const dark = resolveInitialDark();
  themeStore.setDark(dark);
}

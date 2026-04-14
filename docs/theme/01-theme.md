---
title: "Theme"
category: "theme"
tags: ["theme", "injectTheme", "colorScheme", "dark-mode", "css-variables", "design-tokens", "tokens"]
related: ["Installation", "createCalendar", "createTable", "createModal"]
---

# Theme

> Shared design-token system for LiteForge UI packages. CSS custom properties for light/dark mode, plus a reactive `colorScheme()` signal for programmatic toggling.

## Installation

```bash
npm install @liteforge/theme @liteforge/core
```

---

## CSS Import (recommended)

The simplest approach — import the CSS file and the tokens are available globally:

```ts
// Full theme (base + dark)
import '@liteforge/theme/css'

// Light tokens only
import '@liteforge/theme/css/base'

// Dark overrides only (requires base)
import '@liteforge/theme/css/dark'

// Optional CSS reset
import '@liteforge/theme/css/reset'
```

---

## JS Runtime Injection

Use `injectTheme()` when you need lazy injection (e.g. inside a plugin) or runtime token overrides:

```ts
import { injectTheme } from '@liteforge/theme'

// Inject default theme
injectTheme()

// Inject with token overrides
injectTheme({
  tokens: {
    colorAccent: '#7c3aed',
    colorAccentHover: '#6d28d9',
  }
})
```

`injectTheme()` is idempotent — calling it multiple times is safe; the CSS is only injected once.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokens` | `Partial<ThemeTokens>` | — | Token overrides applied as inline CSS custom properties |
| `target` | `string` | `':root'` | CSS selector to apply token overrides to |
| `skipCss` | `boolean` | `false` | Skip base CSS injection (e.g. you already import via bundler) |
| `nonce` | `string` | — | CSP nonce applied to the injected `<style>` element |

---

## colorScheme() — Reactive Dark/Light Toggle

`colorScheme()` returns a singleton `Signal<'light' | 'dark'>` that manages the current color scheme:

```ts
import { colorScheme } from '@liteforge/theme'

const scheme = colorScheme()

scheme()              // 'light' | 'dark' (read)
scheme.set('dark')    // set programmatically
scheme.update(s => s === 'dark' ? 'light' : 'dark')  // toggle
```

### Toggle button example

```tsx
import { colorScheme } from '@liteforge/theme'

const scheme = colorScheme()

export const ThemeToggle = createComponent({
  component() {
    return (
      <button onclick={() => scheme.update(s => s === 'dark' ? 'light' : 'dark')}>
        {() => scheme() === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    )
  }
})
```

### Initialisation order

On the first call, `colorScheme()` reads the initial value in this order:

1. `localStorage.getItem('lf-theme')` — persisted user preference
2. `prefers-color-scheme: dark` media query — OS default
3. `'light'` — final fallback

Every change is automatically:
- Applied as `data-theme="light|dark"` on `<html>` (picked up by `@liteforge/theme` CSS variables)
- Persisted to `localStorage` under `'lf-theme'`

### Tailwind v4 integration

Import `@liteforge/theme/css/tailwind` to register all `--lf-color-*` tokens in Tailwind v4's `@theme` block. This enables utility classes like `text-lf-accent`, `bg-lf-surface`, `border-lf-border` etc.:

```css
/* styles.css */
@import "tailwindcss";
@import "@liteforge/theme/css/base";
@import "@liteforge/theme/css/tailwind";
```

Available utility prefixes (works with all Tailwind color utilities):

| Tailwind class | Token |
|---------------|-------|
| `bg-lf-bg` / `text-lf-bg` | `--lf-color-bg` |
| `bg-lf-surface` | `--lf-color-surface` |
| `bg-lf-surface-raised` | `--lf-color-surface-raised` |
| `border-lf-border` | `--lf-color-border` |
| `border-lf-border-strong` | `--lf-color-border-strong` |
| `text-lf-text` | `--lf-color-text` |
| `text-lf-text-muted` | `--lf-color-text-muted` |
| `text-lf-text-subtle` | `--lf-color-text-subtle` |
| `bg-lf-accent` / `text-lf-accent` | `--lf-color-accent` |
| `text-lf-success` / `bg-lf-success-bg` | `--lf-color-success` |
| `text-lf-danger` / `bg-lf-danger-bg` | `--lf-color-danger` |
| `text-lf-warning` / `bg-lf-warning-bg` | `--lf-color-warning` |

Since the tokens are CSS custom properties, dark mode works automatically — the Tailwind classes adapt when `data-theme="dark"` is set on `<html>`.

### Tailwind v3 integration

Set `darkMode: 'class'` in your Tailwind config and sync the `.dark` class via an effect:

```ts
import { effect } from '@liteforge/core'
import { colorScheme } from '@liteforge/theme'

const scheme = colorScheme()

effect(() => {
  document.documentElement.classList.toggle('dark', scheme() === 'dark')
})
```

---

## CSS Custom Properties

All LiteForge UI packages (`@liteforge/calendar`, `@liteforge/table`, `@liteforge/modal`, etc.) reference these tokens. Override them to brand the entire UI at once.

### Semantic tokens

| Token | CSS Variable | Light | Dark |
|-------|-------------|-------|------|
| `colorBg` | `--lf-color-bg` | `#ffffff` | Mocha crust |
| `colorBgSubtle` | `--lf-color-bg-subtle` | `#f8fafc` | Mocha mantle |
| `colorBgMuted` | `--lf-color-bg-muted` | `#f1f5f9` | Mocha base |
| `colorSurface` | `--lf-color-surface` | `#ffffff` | Mocha base |
| `colorBorder` | `--lf-color-border` | `#e2e8f0` | Mocha surface0 |
| `colorText` | `--lf-color-text` | `#1e293b` | Mocha text |
| `colorTextMuted` | `--lf-color-text-muted` | `#64748b` | Mocha subtext |
| `colorAccent` | `--lf-color-accent` | `#2563eb` | Mocha blue |
| `colorSuccess` | `--lf-color-success` | `#16a34a` | Mocha green |
| `colorDanger` | `--lf-color-danger` | `#dc2626` | Mocha red |
| `colorWarning` | `--lf-color-warning` | `#f97316` | Mocha yellow |

### Spacing & radius tokens

```css
--lf-space-1: 4px;   --lf-space-2: 8px;   --lf-space-3: 12px;
--lf-space-4: 16px;  --lf-space-6: 24px;  --lf-space-8: 32px;

--lf-radius-sm: 4px;  --lf-radius-md: 6px;
--lf-radius-lg: 8px;  --lf-radius-xl: 12px;
```

### Typography tokens

```css
--lf-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--lf-font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;

--lf-text-xs: 11px;  --lf-text-sm: 13px;
--lf-text-base: 14px; --lf-text-md: 16px;
```

---

## Token overrides via CSS

Override tokens directly in your own CSS for full control:

```css
:root {
  --lf-color-accent: #7c3aed;
  --lf-color-accent-hover: #6d28d9;
  --lf-radius-md: 8px;
}

[data-theme="dark"] {
  --lf-color-accent: #a78bfa;
}
```

---

## TypeScript types

```ts
import type { ThemeTokens, InjectThemeOptions, ColorScheme } from '@liteforge/theme'
import { TOKEN_MAP } from '@liteforge/theme'
// TOKEN_MAP: [keyof ThemeTokens, cssVar][] — all token key/variable pairs
```

# @liteforge/vite-plugin

Vite plugin for LiteForge that transforms JSX into optimized DOM operations.

## Installation

```bash
npm install @liteforge/vite-plugin --save-dev
```

## Setup

**vite.config.ts:**

```ts
import { defineConfig } from 'vite'
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()]
})
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@liteforge/runtime"
  }
}
```

## Overview

The LiteForge Vite plugin transforms JSX syntax into direct DOM operations with signal-safe getter wrapping. This eliminates the need for a virtual DOM while maintaining familiar JSX syntax.

## How It Works

The plugin transforms JSX at build time:

**Input:**
```tsx
const Counter = () => {
  const count = signal(0)
  return (
    <div class="counter">
      <p>Count: {count()}</p>
      <button onclick={() => count.update(n => n + 1)}>
        Increment
      </button>
    </div>
  )
}
```

**Output (conceptual):**
```ts
const Counter = () => {
  const count = signal(0)
  
  const _div = document.createElement('div')
  _div.className = 'counter'
  
  const _p = document.createElement('p')
  effect(() => {
    _p.textContent = `Count: ${count()}`
  })
  
  const _button = document.createElement('button')
  _button.textContent = 'Increment'
  _button.addEventListener('click', () => count.update(n => n + 1))
  
  _div.appendChild(_p)
  _div.appendChild(_button)
  
  return _div
}
```

## Options

```ts
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [
    liteforge({
      // File extensions to transform
      extensions: ['.tsx', '.jsx'],
      
      // Enable HMR (experimental)
      hmr: true,
      
      // Enable template extraction for static content
      templates: true,
      
      // Debug mode (logs transformed code)
      debug: false
    })
  ]
})
```

## Signal-Safe Getters

The plugin automatically wraps reactive expressions in getters to ensure proper signal tracking:

```tsx
// Input
<p class={isActive() ? 'active' : 'inactive'}>
  {user().name}
</p>

// The plugin wraps these in getters so effects can track them
```

This means you write natural JSX with signal calls, and the plugin handles reactivity.

## Static Extraction

Static HTML is extracted and converted to templates for better performance:

```tsx
// Static content is optimized
<div class="container">
  <header>
    <h1>My App</h1>
    <nav>...</nav>
  </header>
  {/* Dynamic content still uses effects */}
  <main>{content()}</main>
</div>
```

## Event Handlers

Event handlers are detected and attached directly:

```tsx
<button
  onclick={() => handleClick()}
  onmouseover={(e) => highlight(e)}
>
  Click me
</button>
```

All standard DOM events are supported with the `on` prefix.

## Fragments

Use `<>...</>` for multiple root elements:

```tsx
const List = () => (
  <>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </>
)
```

## Components

Component detection is automatic based on naming convention (PascalCase):

```tsx
// Components (PascalCase) - passed to h() as function reference
<UserCard user={user} />
<Modal isOpen={showModal()} />

// HTML elements (lowercase) - created as DOM elements
<div class="card">...</div>
<button onclick={...}>...</button>
```

## Known Limitations

1. **HMR** — Hot Module Replacement is not fully working yet. Manual browser refresh is required after changes.

2. **Text Spacing** — Adjacent text and signals need explicit spacing:
   ```tsx
   // May need explicit spaces
   <p>Hello{' '}{name()}</p>
   ```

3. **Value Binding** — Form inputs require getter syntax:
   ```tsx
   // Correct
   <input value={() => field.value()} />
   
   // Won't update reactively
   <input value={field.value()} />
   ```

## Advanced: Transform API

For testing or custom tooling:

```ts
import { transform, transformCode } from '@liteforge/vite-plugin'

const result = transform(code, {
  extensions: ['.tsx'],
  hmr: false,
  templates: true
}, isDev)

// result.code - transformed code
// result.map - source map
// result.hasJsx - whether JSX was found
```

## Types

```ts
import type {
  LiteForgePluginOptions,
  ResolvedPluginOptions
} from '@liteforge/vite-plugin'
```

## License

MIT

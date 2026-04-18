# @liteforge/bun-plugin

Bun-native bundler plugin for LiteForge. Transforms JSX into direct DOM operations using Bun's plugin API — no Vite required.

## Installation

```bash
bun add -d @liteforge/bun-plugin
```

## Setup

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "liteforge"
  }
}
```

## Production Build

**build.ts:**

```ts
import { liteforgeBunPlugin } from '@liteforge/bun-plugin'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const outDir = './dist'
mkdirSync(outDir, { recursive: true })

const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: outDir,
  target: 'browser',
  minify: true,
  plugins: [liteforgeBunPlugin()],
})

if (!result.success) {
  for (const msg of result.logs) console.error(msg)
  process.exit(1)
}

// Copy static assets
copyFileSync('./src/styles.css', `${outDir}/styles.css`)

// Patch index.html with the output filename
const output = result.outputs.find(o => o.path.endsWith('.js'))
const jsPath = output ? output.path.replace(`${outDir}/`, '/') : '/main.js'
const html = readFileSync('./index.html', 'utf8').replace('/main.js', jsPath)
writeFileSync(`${outDir}/index.html`, html)
```

```json
// package.json
{
  "scripts": {
    "build": "bun run build.ts"
  }
}
```

## Dev Server

**dev.ts:**

```ts
import { createDevServer } from '@liteforge/bun-plugin/dev'
import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('./dist', { recursive: true })
copyFileSync('./src/styles.css', './dist/styles.css')
copyFileSync('./index.html', './dist/index.html')

createDevServer({
  entry: './src/main.tsx',
  outDir: './dist',
  port: 3000,
})
```

```json
// package.json
{
  "scripts": {
    "dev": "bun run dev.ts"
  }
}
```

The dev server rebuilds on every request. No HMR in v0.1 — browser refresh required.

## API

### `liteforgeBunPlugin(options?)`

Returns a `BunPlugin` for use with `Bun.build()`. Pass as an element of the `plugins` array.

```ts
import { liteforgeBunPlugin } from '@liteforge/bun-plugin'

await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  plugins: [liteforgeBunPlugin()],
})
```

**Options** (all optional — see `@liteforge/transform` for full reference):

| Option | Type | Default | Description |
|---|---|---|---|
| `autoWrapProps` | `boolean` | `true` | Wrap `props.x` in JSX content position in getter `() => props.x` |
| `templateExtraction` | `boolean \| 'auto'` | `'auto'` | Extract static DOM templates in production builds |

### `createDevServer(options)` — `@liteforge/bun-plugin/dev`

Starts a `Bun.serve` dev server with SPA fallback routing.

```ts
import { createDevServer } from '@liteforge/bun-plugin/dev'

createDevServer({
  entry: './src/main.tsx',   // entrypoint passed to Bun.build
  outDir: './dist',          // output directory (must exist)
  port: 3000,                // default: 3000
})
```

- All non-asset requests return `dist/index.html` (SPA fallback)
- Assets (`*.js`, `*.css`, etc.) are served from `outDir`
- Rebuilds on every non-asset request

## index.html Template

The plugin does not generate `index.html` — provide your own template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

The `build.ts` script patches the `/main.js` reference with the actual output filename.

## How It Works

```
src/main.tsx
    ↓ Bun.build() onLoad hook
    ↓ @liteforge/transform — transformJsx() converts JSX → h() calls
    ↓ Bun TypeScript strip (loader: 'tsx'/'jsx')
    ↓ Bun bundler — tree-shaking, minification, module resolution
dist/main.js
```

The plugin intercepts `.tsx` and `.jsx` files, runs the LiteForge JSX transform, and returns the result with `loader: 'tsx'` or `loader: 'jsx'` so Bun handles TypeScript stripping and further bundling.

## v0.1 Limitations

The following are intentionally out of scope for v0.1:

- **No HMR** — manual browser refresh required. Coming in a later step.
- **No Tailwind v4** — static CSS only.
- **No SSR** — client-side SPA only.
- **No file-based routing** — define routes manually with `@liteforge/router`.
- **Single entrypoint** — one `main.tsx`, no code-splitting configuration.
- **No source map tuning** — Bun defaults apply.

## CSS

Import CSS directly in your app entry:

```ts
import './styles.css'
```

Bun bundles CSS alongside JS. Copy the output CSS file as part of your `build.ts` script.

For packages with `injectDefaultStyles()` (e.g. `@liteforge/toast`): these work correctly in Bun as of v0.1. Other UI packages (`modal`, `table`, `calendar`) are Bun-incompatible until their `?url` CSS imports are replaced — see CLAUDE.md Bun Compatibility Status.

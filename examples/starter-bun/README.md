# starter-bun

Minimal LiteForge app built with Bun's native bundler — no Vite.

## Dev

```sh
bun run dev
```

Starts a dev server at http://localhost:3000. Rebuilds on every request (no HMR in v0.1).

## Build

```sh
bun run build
```

Produces a deployable `dist/` directory. Serve with any static host:

```sh
bunx serve dist/
```

## What this demonstrates

- LiteForge JSX transform via `@liteforge/bun-plugin`
- Client-side routing with `@liteforge/router` (2 routes: `/` and `/about`)
- Form with submit via `@liteforge/form`
- Toast notifications via `@liteforge/toast`
- CSS loaded via static import

## Low-Level RPC API (Phase 2 Step 1)

`src/server/` contains a demonstration of the `@liteforge/server` Low-Level API:

```
src/server/
  greetings.server.ts   — defineServerModule with a typed hello() fn
  api.ts                — liteforgeServer({ modules: { greetings } }) + InferServerApi
```

This is the **expert-usage variant** — explicit registration, full control, no magic.

```ts
// server/greetings.server.ts
export const greetingsModule = defineServerModule('greetings')
  .serverFn('hello', {
    input: z.object({ name: z.string() }),
    handler: async (input) => ({ greeting: `Hello, ${input.name}!`, timestamp: Date.now() }),
  })
  .build()

// server/api.ts
export const api = liteforgeServer({ modules: { greetings: greetingsModule } })
export type Api = InferServerApi<typeof api>

// client
import type { Api } from './server/api'
const { useServer } = serverClientPlugin<Api>()
const server = useServer()
const result = await server.greetings.hello({ name: 'René' })
//    result.greeting → string ✓  (typed, envelope transparent)
```

**RPC security defaults (active):**
- `X-Liteforge-RPC: 1` header required on every call → 403 if missing
- CORS: same-origin default, configurable via `cors: { origins: [...] }`
- Zod validation on every input → 400 with field errors if invalid

**Note:** A fully integrated Browser+Server demo with `defineApp` is coming in **Phase 2 Step 1.5**.
That step introduces the high-level fullstack façade (`defineApp`, `.serverModules()`, `.listen()`)
and will refactor this starter app into a single integrated entry point.

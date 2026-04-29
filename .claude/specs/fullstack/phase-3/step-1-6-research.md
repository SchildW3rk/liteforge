# Step 1.6 — OakBun als Fullstack-Citizen in `defineApp`

**Phase 1: Research. KEINE Implementation, KEINE API-Entscheidungen.**

Dieses Dokument sammelt Fakten über (a) OakBun's API-Shape, (b) wie LiteForge OakBun heute nutzt, (c) wo User-OakBun-Module im LiteForge-`defineApp` einhängen könnten, (d) URL-Space-Konflikte. Design-Entscheidungen folgen in einem Nachfolge-Dokument.

Quellen:
- OakBun-Docs über SchildW3rk-MCP (`list_projects` → 46 Files unter `oakbun/`)
- `packages/server/src/_lifecycle.ts`, `_internal.ts`, `define-app.ts` (lokaler Code)
- OakBun-Version: `0.5.4` (aus `packages/server/package.json`)

---

## 1. OakBun API-Shape

### 1.1 `createApp()` — die `Veln`-App-Instanz

**Signature:**
```ts
function createApp(): Veln
```

**App-Methoden (alle relevant für uns):**

| Methode | Zweck |
|---|---|
| `app.plugin(plugin)` | Plugin registrieren (registration-order; `requires()` validated at startup) |
| `app.use(serviceOrMiddleware)` | Service/Middleware global einhängen — **nicht für Plugins** |
| `app.register(module)` | Gebautes `VelnModule` mounten |
| `app.listen(port \| opts)` | Bun-HTTP-Server starten → `Server`-Instanz |
| `app.close()` | Graceful Shutdown; ruft `teardown()` aller Plugins in reverse order |
| `app.get/.post/.put/.patch/.delete(path, handler\|def)` | Top-Level-Routen direkt auf App (ohne Modul) |
| `app.on(event, handler)` | Typed Event-Bus-Subscription |
| `app.onRequest/.onBeforeHandle/.onResponse/.onError(fn)` | App-Level-Lifecycle-Hooks |
| `app.getOpenApiSpec(opts?)` | OpenAPI 3.0 Spec aus allen Routen mit `body/params/query/response`-Schemas |
| `app.registerWsAdapter(ws)` | WebSocket-Adapter (`@oakbun/ws`) einhängen |

**Minimal-Pattern aus Docs:**
```ts
const app = createApp()
app.plugin(dbPlugin(new SQLiteAdapter({ filename: 'app.db' })))
app.register(usersModule)
app.listen(3000)
```

### 1.2 `defineModule(prefix)` — Route-Gruppen

**Signature:**
```ts
function defineModule<TCtx extends BaseCtx = BaseCtx>(
  prefix: string
): ModuleBuilder<TCtx>
```

**ModuleBuilder-Methoden:**

| Methode | Returns | Zweck |
|---|---|---|
| `.get/.post/.put/.patch/.delete(path, handler\|def)` | `this` | HTTP-Route |
| `.plugin(plugin)` | `this` | Plugin nur für dieses Modul |
| `.guard(guard)` | `this` | Guard für alle Routen (per-route opt-out via `guard: false`) |
| `.use(serviceDef \| middlewareDef)` | `this` | Service/Middleware ins ctx injizieren |
| `.hook(table, handlers)` | `this` | Table-Hooks (afterInsert etc.) mit ctx-Access |
| `.audit(table, config)` | `this` | Automatisches Audit-Logging |
| `.events(handlerDef)` | `this` | Event-Handler am Modul-EventBus |
| `.cron(cronDef)` | `this` | Cron-Job (started mit App) |
| `.onRequest/.onBeforeHandle/.onResponse/.onError(fn)` | `this` | Lifecycle-Hooks |
| `.meta(opts)` | `this` | OpenAPI-Tag + Description |
| `.visibility(v)` | `this` | `'public' \| 'private' \| 'internal'` |
| `.options(opts)` | `this` | Log-Options |
| `.build()` | `VelnModule` | **Abschließen** — dieses Objekt gibt man in `app.register(...)` |

**Route-Definition — zwei Overloads:**
```ts
// Plain Handler
.get('/path', async (ctx) => ctx.json({ ok: true }))

// Typed Schema + Handler
.post('/path', {
  params:   z.object({ id: z.coerce.number() }),
  query:    z.object({ page: z.coerce.number().optional() }),
  body:     z.object({ name: z.string() }),
  response: z.object({ id: z.number() }),
  guard:    myGuard,
  docs:     { summary: 'Create a user', operationId: 'createUser' },
  handler:  async (ctx) => ctx.json(result),
})
```

### 1.3 `definePlugin(name)` — Ctx-Extender + Module-Bundler

**Signature:**
```ts
function definePlugin<TAdd extends Record<string, unknown>>(
  name: string
): PluginBuilder<TAdd>
```

**PluginBuilder-Methoden:**

| Methode | Zweck |
|---|---|
| `.requires(names: string[])` | Dependency-Deklaration; Startup-validiert |
| `.options(opts)` | Log-Options |
| `.modules(list: VelnModule[])` | Module bundeln — automatisch mitregistriert |
| `.guard(fn \| fn[])` | Plugin-Level-Guard für alle gebundelten Module |
| `.permission(name)` | Permission-String deklarieren |
| `.nav(item: NavItem)` | Server-Driven-Nav-Item |
| `.extend(fn)` | Shorthand: per-request Ctx-Additions |
| `.build(def)` | Full-Control: komplettes `Plugin`-Objekt |

**`Plugin<TCtx, TAdd>`-Interface (für manuelle Konstruktion):**
```ts
interface Plugin<TCtx, TAdd extends Record<string, unknown>> {
  name:         string
  requires?:    string[]
  modules?:     VelnModule[]
  permissions?: string[]
  nav?:         NavItem[]
  guards?:      Guard<any>[]
  install?:     (hooks: HookExecutor) => void | Promise<void>
  request:      (ctx: TCtx) => TAdd | Promise<TAdd>
  teardown?:    () => void | Promise<void>
}
```

**Wichtig:** `request(ctx)` ist der Hook, über den Plugins `ctx` erweitern. Läuft bei jedem Request in Registrierungsreihenfolge. Das ist exakt, was LiteForge heute mit `liteforge-context` macht (Plugin, das User-Context pro Request resolved).

### 1.4 `defineGuard(name)` — Auth-/Authorization-Funktionen

**Signature:**
```ts
function defineGuard(name: string): GuardBuilder
```

**GuardBuilder-Methoden:**
- `.options(opts)` — Log-Options
- `.check<TAdd>(fn)` — Guard-Funktion. **Throw blockiert, return durchläuft.**

**Guard-Hierarchie (wichtig für URL-Space-Diskussion später):**
```
Request
  → app-level onRequest hooks
  → plugin.request() called in registration order (extends ctx)
  → module-level onRequest hooks
  → plugin guard(s)     ← .guard() on definePlugin
  → module guard(s)     ← .guard() on defineModule
  → route guard         ← guard: fn on individual route
  → onBeforeHandle hooks
  → handler
  → onResponse hooks
```

**Guard-Isolation:** Plugin-Guards wirken NUR auf Module des selben Plugins. Andere Plugins und direkt mit `app.get(...)` registrierte Routen sind nicht betroffen.

### 1.5 `defineResource(name, table, options?)` — CRUD-Sugar

**Signature:**
```ts
function defineResource<T, S extends SchemaMap>(
  name: string,
  table: TableDef<T, S>,
  options?: ResourceOptions<T, InferInsert<S>>
): { module: VelnModule }
```

Produziert 5 Standard-Routen: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`. Ergebnis ist ein `.module`-Property mit einem fertigen `VelnModule` — also aus LiteForge-Sicht **identisch behandelbar zu einem selbstgebauten `defineModule(...).build()`**. Kein Extra-Integrationspfad nötig.

Relevant für uns: `options.routes.{index,show,store,update,destroy}` akzeptieren `false` → Route komplett entfernen; oder `{ guard, summary }` → Route konfigurieren. `options.prefix` überschreibt den Default (`/<name>`).

### 1.6 Auth / `@oakbun/auth` — Better-Auth-Integration

Eigenes Plugin-Paket `@oakbun/auth` (nicht in `oakbun` core). Installiert sich als regulärer OakBun-Plugin:
```ts
app.plugin(betterAuthPlugin({ secret, baseUrl, trustedOrigins }, adapter))
```

Fügt `ctx.betterUser`, `ctx.session`, `ctx.auth` hinzu. Interceptet `/api/auth/*`-Routen (Better-Auth's eigener Handler). Aus LiteForge-Sicht: **transparent** — wenn der User das Plugin in `defineApp(...).plugin(betterAuthPlugin(...))` registriert, bekommt er die ctx-Extensions automatisch (wenn unser Type-Merging für `.plugin()` vollständig ist → TODO in spätere Phase).

Alternativ `@oakbun/jwt` (`jwtPlugin(secret, { optional? })`) fügt `ctx.jwtUser: JwtPayload | undefined` hinzu.

### 1.7 `BaseCtx` — das Fundament

```ts
interface BaseCtx {
  req:     Request
  params:  Record<string, string>
  query:   Record<string, string | string[]>
  body?:   unknown
  json:    <T>(data: T, status?: number) => Response
  text:    (data: string, status?: number) => Response
  html:    (data: string, status?: number) => Response
  stream:  (writer, opts?) => Response
  sse:     (writer) => Response
  cookie:  CookieJar
  emit:    <K>(event: K, payload) => void
  logger?: Logger
  db?:     BoundVelnDB
  events?: EventBus
}
```

**Interessant**: LiteForge's `BaseCtx` (in `packages/server/src/types.ts`) ist eine **engere Version** — nur `req`. Die RPC-Handler bekommen derzeit kein `ctx.json()`, kein `ctx.db`, etc. — sie returnen ein plain Object und LiteForge's `handleRpcRequest` wrappt es selbst in `Response`. Das ist Design-Entscheidung (RPC ≠ Rest), aber: wenn User ihre OakBun-Module in die gleiche App hängen, haben deren Handler den vollen OakBun-`BaseCtx`. Zwei Ctx-Welten parallel.

---

## 2. Wie LiteForge OakBun heute nutzt (Ist-Zustand)

### 2.1 Einhänge-Punkt: `startServer()` in `_lifecycle.ts:295–445`

Reihenfolge der Calls auf dem OakBun-App-Objekt:

1. **`createApp()`** — `packages/server/src/_lifecycle.ts:301–302`
2. **User-OakBun-Plugins** aus `state.oakbunPlugins` — `_lifecycle.ts:303–305`
   ```ts
   for (const p of state.oakbunPlugins) {
     ;(oakbun as unknown as { plugin: (p: unknown) => void }).plugin(p)
   }
   ```
3. **LiteForge-Context-Plugin** (falls `state.options.context` gesetzt) — `_lifecycle.ts:307–317`
   ```ts
   const extensionPlugin: Plugin<BaseCtx, Record<string, unknown>> = {
     name: 'liteforge-context',
     request: async (ctx) => {
       const resolved = await resolveRequestContext(contextDeclaration, ctx.req)
       return { ...ctx, ...resolved }
     },
   }
   oakbun.plugin(extensionPlugin)
   ```
4. **Static Assets** aus `publicDir` — `registerStaticAssets(oakbun, ...)` registriert per `oakbun.get(urlPath, handler)` pro Datei (rekursiv). Reserved-Paths werden geskippt mit Warning. — `_lifecycle.ts:319–323, 561–632`
5. **RPC-Routen** (falls `state.modulesMap`) — `registerRpcRoutes(oakbun, modulesMap)` registriert pro RPC-Function eine `oakbun.post` + `oakbun.options` auf `${DEFAULT_RPC_PREFIX}/{moduleKey}/{fnName}`. `DEFAULT_RPC_PREFIX = '/api/_rpc'`. — `_lifecycle.ts:325–327, 634–664`
6. **Client-Bundle-Serving** falls `clientEntry` — `oakbun.get('/client.js', ...)` + pro Chunk `oakbun.get('/${basename}', ...)`. — `_lifecycle.ts:392–428`
7. **HMR-WebSocket-Server** (im Dev-Mode, eigener Bun-Server auf separatem Port) — `_lifecycle.ts:480–552`
8. **HTML-Shell bei `/`** — `oakbun.get('/', ...)` liefert gerenderten Document-String. — `_lifecycle.ts:373–390`
9. **`oakbun.listen(port)`** — `_lifecycle.ts:430–432`

### 2.2 Was NICHT verwendet wird

- `app.register(module)` — **wird heute nicht aufgerufen.** Bis hier gibt es keinen offiziellen Pfad, ein gebautes `VelnModule` in `defineApp` einzuhängen. User, die eine komplette OakBun-App als "darunterliegende" Layer wollen, müssten das Modul als `Plugin.modules = [module]` verpacken und über `.plugin(...)` einschleusen (unkonventionell).
- `app.use(serviceOrMiddleware)` — ungenutzt.
- `app.on(event, handler)` — ungenutzt.
- `app.onRequest/.onBeforeHandle/.onResponse/.onError` — ungenutzt.
- `app.getOpenApiSpec()` — ungenutzt (wäre aber Killer-Feature, wenn LiteForge-RPC + User-Module zusammen in einer Spec landen).
- `app.registerWsAdapter(ws)` — ungenutzt.

### 2.3 Shape, die heute akzeptiert wird

`FullstackAppBuilder.plugin(plugin: OakBunPluginLike)` in `define-app.ts:132, 169–172`:

```ts
export type OakBunPluginLike = Plugin<any, object>
```

Also nur **OakBun-Plugins** (kein Modul, kein Service, kein Guard). State wird in `BuilderState.oakbunPlugins: OakBunPluginLike[]` gesammelt. Alles andere muss der User aktuell DIY über ein selbstgebautes `Plugin` mit `.modules = [...]` Property durchschleusen.

### 2.4 Typ-Lücke

`state.oakbunPlugins: OakBunPluginLike[]` ist `Plugin<any, object>` — alle `TAdd`-Typen werden zu `object` geschluckt. Das bedeutet: selbst wenn ein OakBun-Plugin `ctx.jwtUser` hinzufügt, sieht das **LiteForge-RPC-Handler-Ctx** das nicht automatisch. Type-Flow User-Plugin → RPC-Handler-Ctx fehlt aktuell.

---

## 3. Integration-Frage (Fakten, keine Entscheidung)

### 3.1 Was der User derzeit nicht einhängen kann

| Concept | Heute möglich via `defineApp`? | Workaround |
|---|---|---|
| OakBun-Plugin (`definePlugin(...).extend(...)`) | ✅ `.plugin(p)` | — |
| OakBun-Modul (`defineModule(...).build()`) | ❌ | Plugin mit `.modules = [m]` Property manuell bauen |
| OakBun-Resource (`defineResource(...)`) | ❌ | Ergebnis ist `{ module }` — gleiche Situation wie Modul |
| OakBun-Guard (`defineGuard(...).check(...)`) | ❌ (nur via Module/Plugin) | Wie oben |
| App-Level `app.use(service)` | ❌ | Muss in Plugin gewrappt werden |
| App-Level `app.onRequest/.onResponse/.onError(fn)` | ❌ | Plugin mit passendem Lifecycle-Hook |
| Top-Level `app.get('/health', ...)` | ❌ | Muss in Plugin/Modul gewrappt werden |

### 3.2 Positionen, an denen eine neue API-Methode andocken könnte

Der Builder-Chain sieht heute so aus:
```ts
defineApp({ root, target, context?, document? })
  .plugin(oakbunPlugin)          // N×
  .use(liteforgePlugin)          // N×
  .serverModules({ ... })        // 1× (type-gated)
  .mount() | .listen() | .build() | .dev()
```

> **Framing-Shift (v2):** Die ersten drei Kandidaten betrachten nur die Einhängung **einer** OakBun-Entity (Modul) und behandeln OakBun als **Library, die LiteForge orchestriert**. Die Prämisse von Step 1.6 ist aber umgekehrt: **LiteForge-Fullstack _ist_ OakBun + Extensions**. Der User soll `createApp(...)` durch `defineApp(...)` ersetzen können und seine komplette OakBun-App funktioniert weiter. Deshalb ist Kandidat D (Superset-Pass-Through) der primäre Pfad; A/B/C bleiben als Teil-Optionen für den Spezialfall "nur Module einhängen" dokumentiert.

**Kandidaten-Positionen für OakBun-Module:**

1. **(A) Neue Builder-Methode** `.oakbun(module)` oder `.register(module)` — symmetrisch zu `.plugin()`, sammelt in `state.oakbunModules: VelnModule[]`, in `startServer` über `oakbun.register(m)` eingehängt. Nur Module, nicht die ganze OakBun-API.
2. **(B) Erweiterte `.plugin()`** die Union akzeptiert: `Plugin | VelnModule | ResourceResult`. Unterscheidung via Shape-Discriminator zur Laufzeit. Weniger Method-Proliferation, aber unschärfere API. Deckt nur Plugin + Modul ab, keine Hooks / Routes / Services.
3. **(C) Extra-Config-Sektion**: `defineApp({ ..., oakbun: { modules: [...], plugins: [...], hooks: {...} } })` — deklarativ statt chainable. Skaliert nicht für die 20+ OakBun-App-Methoden.
4. **(D) Superset-Pass-Through** — **der eigentliche Step-1.6-Pfad.** Der `FullstackAppBuilder` **exponiert die gesamte `Veln<TCtx, TRoutes, TPrefixes>`-API first-class** auf sich selbst. Jede OakBun-Method auf dem Builder delegiert intern an die gewrappte OakBun-App und gibt den **Builder** zurück (nicht die rohe `Veln`), sodass `.plugin()`, `.register()`, `.get()`, `.use()`, `.serverModules()`, `.listen()` in beliebiger Reihenfolge chainable bleiben. Types propagieren durch den Builder: `Veln<TCtx & TAdd, TRoutes & TModuleRoutes>` wird als `FullstackAppBuilder<TContext, TModules, TServerModulesCalled, TCtx & TAdd, TRoutes & TModuleRoutes>` weitergereicht. Der User-Migrations-Test (`createApp` → `defineApp` ersetzen, sonst nichts) funktioniert genau dann, wenn D erfüllt ist. Siehe Sektion 6 für die Method-Level-Overlap-Analyse, die für Kandidat D durchgespielt werden muss.

**Timing-Frage** (wann werden Module registriert):

Heute läuft die Reihenfolge: User-Plugins → LiteForge-Context-Plugin → Static → RPC → Client-Bundle → HTML-Root. Wenn User-Module dazukommen, müssen sie zwischen "Plugins registered" und "Reserved-Routes registered" laufen, damit:
- User-Module nutzen können, was die Plugins ins `ctx` gelegt haben.
- LiteForge-Reserved-Routes (`/`, `/client.js`, `/api/_rpc/*`, `/__liteforge_hmr__`, Static-Assets) garantiert registriert bleiben, egal was der User registriert — oder: vor User-Modulen registriert und Conflict-Detection warnt.

### 3.3 Type-Inference-Frage

Wenn User `.plugin(jwtPlugin(...))` und `.oakbun(myProtectedModule)` aufruft, sollte der Modul-Handler-Ctx `ctx.jwtUser: JwtPayload` haben. Heute schluckt `OakBunPluginLike = Plugin<any, object>` alle `TAdd`-Typen. Für brauchbares Type-Flow braucht es:

```ts
plugin<TAdd>(p: Plugin<any, TAdd>): Builder<TCtx & TAdd, ...>
```

Das ist Phase-C-Territory (typelevel) — in der Research-Phase nur festhalten.

### 3.4 Offene Fragen (nicht entscheiden, nur listen)

- Soll LiteForge's `ctx.context` (User-Context aus `defineApp({ context })`) **auch** in User-OakBun-Modul-Handlern verfügbar sein? Heute wird es nur für RPC-Handler über `resolveRequestContext` aufgelöst — aber das `liteforge-context`-Plugin erweitert das OakBun-Ctx bereits für JEDEN Request. Also Ja-automatisch. Dokumentieren.
- Soll `.oakbun(module)` auch im Client-Bundle nicht auftauchen? → Ja, gleicher Pfad wie `.plugin()` (werden nur im `_lifecycle.ts`-Server-Pfad gelesen, tree-shaken in `.mount()`).
- Soll `defineApp({ context })` als OakBun-Plugin `requires(['liteforge-context'])` für User-Plugins sichtbar sein?
- Wie interagieren OakBun-`.nav()`-Items mit LiteForge's Frontend? (Server-Driven-Nav). Out of scope für Step 1.6.
- `app.getOpenApiSpec()` — für die Zukunft attraktiv, aber nicht Step-1.6-Thema.

---

## 4. URL-Space-Konflikt-Analyse

### 4.1 Heute von LiteForge belegt

Aus `_lifecycle.ts`:

```ts
const RESERVED_ROUTES = new Set(['/', '/client.js', '/__liteforge_hmr__'])
const RESERVED_PREFIX = '/api/'   // ⚠ ganzer /api/ Namespace, nicht nur /api/_rpc/
const HMR_WS_PATH = '/__liteforge_hmr__'
const DEFAULT_RPC_PREFIX = '/api/_rpc'
```

Vom Server registriert:

| URL-Pattern | Zweck | Registriert wo |
|---|---|---|
| `GET /` | HTML-Shell | `_lifecycle.ts:373–390` |
| `GET /client.js` | Client-Bundle | `_lifecycle.ts:396–406` |
| `GET /${chunkBasename}` | Code-Splitting-Chunks (dynamisch pro Build) | `_lifecycle.ts:412–427` |
| `GET /${staticAsset}` | Static-Assets aus `publicDir` (rekursiv) | `_lifecycle.ts:601–620` |
| `POST /api/_rpc/{moduleKey}/{fnName}` | RPC-Endpoint | `_lifecycle.ts:651–661` |
| `OPTIONS /api/_rpc/{moduleKey}/{fnName}` | CORS-Preflight | `_lifecycle.ts:646–649` |
| `GET /__liteforge_hmr__` (WS) | HMR-WebSocket (Dev nur, eigener Port) | `_lifecycle.ts:517–531` |

### 4.2 Conflict-Detection heute

**Static-Asset-Registrierung** (`registerStaticAssets`) prüft gegen `RESERVED_ROUTES` + `RESERVED_PREFIX = /api/` und skipt mit Warning. → User-Static-Asset `public/api/foo.json` wird NICHT served.

**RPC-Route-Registrierung** hat keine Conflict-Detection — sie wird nach Static-Assets registriert, gewinnt also bei Überlapp. (Praktisch irrelevant, weil Statics den `/api/`-Prefix geskippt haben.)

**User-OakBun-Plugin-Routen** (durch `oakbun.plugin(p)` mit `p.modules = [...]`) haben heute **keine** Conflict-Detection. Ein User-Plugin, das ein Modul mit `defineModule('/api/_rpc')...` bundelt, kollidiert still.

### 4.3 URL-Space-Empfehlung (Fakten-Stand, keine API-Entscheidung)

- **Reserviert bleiben sollten** (LiteForge-Framework-Pfade):
  - `/` (HTML-Shell — User könnte theoretisch eigenen Handler wollen → Edge-Case-Diskussion separat)
  - `/client.js` und alle generierten `/chunk-*.js`
  - `/api/_rpc/*` (RPC-Namespace)
  - `/__liteforge_*` (Framework-Internals-Namespace; HMR und alles Zukünftige)
- **Frei für User** (Konvention aus OakBun-Docs und Framework-Konsens):
  - `/api/*` außer `/api/_rpc/*` — also `/api/health`, `/api/webhook`, etc.
  - Alles andere, was nicht mit `/__liteforge_*` oder `/chunk-*` beginnt.
- **Edge-Case `/api/`-Prefix-Blockade**: Heute blockiert `RESERVED_PREFIX = '/api/'` jede Static-Asset-Registrierung unter `/api/`. Das ist **zu breit** — `/api/openapi.json` als Static-Asset würde geblockt. Sobald User-Module unter `/api/*` laufen dürfen, muss diese Regel relaxiert werden (nur `/api/_rpc/*` + `/__liteforge_*` blocken).
- **Better-Auth Kollision**: `betterAuthPlugin` interceptet `/api/auth/*`. Wenn User sowohl Better-Auth als auch LiteForge-RPC unter `/api/*` nutzt, ist das kompatibel (disjunkte Pfade). Dokumentieren.

### 4.4 Was User heute im URL-Space erwarten sollten

Aus OakBun-Conventions:
- **Standard-REST-APIs** → `/users`, `/posts` (ohne `/api/`-Prefix per OakBun-Default).
- **Explizit als "API" markierte Endpoints** → `/api/health`, `/api/v1/...` (User-Choice).
- **Framework-internal** → `/__liteforge_*` (von uns reserviert).
- **RPC (LiteForge-spezifisch)** → `/api/_rpc/*` (von uns reserviert, unter `/api/` weil Convention und weil der Prefix konfigurierbar ist via `DEFAULT_RPC_PREFIX`).

---

## 5. Zusammenfassung der Fakten

### 5.1 OakBun-API-Shape (relevant für Integration)

| Entity | Factory | Ergebnis-Typ | Registriert via |
|---|---|---|---|
| App | `createApp()` | `Veln` | — |
| Plugin | `definePlugin(name).extend/.build()` | `Plugin<TCtx, TAdd>` | `app.plugin(p)` |
| Module | `defineModule(prefix)...build()` | `VelnModule` | `app.register(m)` |
| Resource | `defineResource(name, table, opts?)` | `{ module: VelnModule }` | `app.register(r.module)` |
| Guard | `defineGuard(name).check(fn)` | `Guard<TCtx>` | via `.guard()` auf Module/Plugin/Route |
| Service | `defineService(name).define(fn)...build()` | `ServiceDef<T>` | `app.use(s)` oder `module.use(s)` |
| Middleware | `defineMiddleware(...)` | `MiddlewareDef` | `app.use(m)` oder `module.use(m)` |
| Cron | `defineCron(name, schedule).handler(fn)...build()` | `CronDef` | via `module.cron(c)` |

### 5.2 LiteForge-Ist-Zustand (Integration-Punkte)

| LiteForge-Feature | OakBun-Call | Code-Zeile |
|---|---|---|
| `.plugin(p)` | `oakbun.plugin(p)` | `_lifecycle.ts:303–305` |
| Context-Support | synthetisches `liteforge-context`-Plugin | `_lifecycle.ts:307–317` |
| Static-Assets | `oakbun.get(urlPath, handler)` pro Datei | `_lifecycle.ts:601–620` |
| RPC | `oakbun.post/.options(routePath, ...)` | `_lifecycle.ts:646–661` |
| Client-Bundle | `oakbun.get('/client.js' \| '/chunk-*.js', ...)` | `_lifecycle.ts:396–427` |
| HTML-Shell | `oakbun.get('/', ...)` | `_lifecycle.ts:373–390` |

### 5.3 Fehlend in `defineApp` (heute kein Pfad)

- `.oakbun(module)` / `.register(module)` — OakBun-Module einhängen
- `.resource(defineResource(...))` — direkte Resource-Einhängung (Convenience über Modul-Einhängung)
- `.guard(guard)` auf App-Ebene (ginge über Plugin mit `.guard()`)
- App-Level-Hooks (`onRequest`/`onError`/`onResponse`)
- Typed-Ctx-Flow User-Plugin → RPC-Handler (separates Phase-C-Thema)

### 5.4 URL-Space

- **Reserviert**: `/`, `/client.js`, `/chunk-*.js`, `/api/_rpc/*`, `/__liteforge_*`
- **User-frei**: alles andere, inkl. `/api/*` außer `/api/_rpc/*`
- **Aktuelle Bug/Enge**: `RESERVED_PREFIX = '/api/'` ist zu breit für Static-Assets → sobald User-Module unter `/api/*` erlaubt sind, muss auf `/api/_rpc/` + `/__liteforge_*` verengt werden.

---

## 6. Method-Overlap-Analyse (Kandidat-D-Pflichtaufgabe)

Da der `FullstackAppBuilder` unter Kandidat D die **komplette** OakBun-App-API first-class präsentieren muss, ist jeder Method-Name ein potenzieller Kollisionspunkt. Diese Sektion listet **jede** Method, die in mindestens einer der beiden Seiten existiert, und klassifiziert sie.

### 6.1 Ground Truth

**OakBun-App (`Veln<TCtx, TRoutes, TPrefixes>`)** — aus `node_modules/oakbun/dist/app/index.d.ts:14–244`:

| Method | Signatur (vereinfacht) | Chainable-Return |
|---|---|---|
| `get / post / put / patch / delete` | `(path, handler)` **oder** `(path, schema, handler)` | `this` **oder** typed-extended `Veln<...>` |
| `plugin` | `<TAdd>(p: Plugin<TCtx, TAdd>)` | `Veln<TCtx & TAdd, TRoutes, TPrefixes>` |
| `use` (overload 1) | `<TKey,TDef>(s: ServiceDef<TKey,TDef>)` | `Veln<TCtx & Record<TKey,TDef>, TRoutes, TPrefixes>` |
| `use` (overload 2) | `(m: MiddlewareDef)` | `this` |
| `register` (overload 1) | `<TModuleRoutes, TModulePrefix>(m: VelnModule & {...})` | `Veln<TCtx, TRoutes & TModuleRoutes, TPrefixes \| TModulePrefix>` |
| `register` (overload 2) | `(m: VelnModule)` | `this` |
| `registerWsAdapter` | `(a: VelnWsAdapter)` | `this` |
| `ws` | `(path, route: WsRouteShape)` | `this` |
| `on` | `<K>(event: K, handler)` | `this` |
| `onEvent` | `<TMap,K>(table, event, handler)` | `this` |
| `events` | `(def: EventHandlerDef)` | `this` |
| `cron` | `<TServices>(def: CronDef<TServices>)` | `this` |
| `onError` | `(h: ErrorHandler<TCtx>)` | `this` |
| `onRequest` | `(h: OnRequestHook<TCtx>)` | `this` |
| `onBeforeHandle` | `(h: OnBeforeHandleHook<TCtx>)` | `this` |
| `onResponse` | `(h: OnResponseHook<TCtx>)` | `this` |
| `options` | `(opts: { validateResponse? })` | `this` |
| `fetch` | `(req, server?)` | `Promise<Response>` — nicht chainable |
| `close` | `()` | `Promise<void>` — terminal |
| `getOpenApiSpec` | `(opts?)` | `OpenApiSpec` |
| `getRoutes` | `()` | `RouteInfo[]` |
| `printRoutes` | `(opts?)` | `void` |
| `listen` | `(port, cb?, opts?)` | `Bun.Server` |

**Bestätigung: kein `.decorate()`, kein public `.guard()` auf `Veln`.** Guards leben ausschließlich auf Module/Plugin-Ebene.

**LiteForge-Fullstack-Builder (`FullstackAppBuilder<TContext, TModules, TServerModulesCalled>`)** — aus `packages/server/src/define-app.ts:127–146`:

| Method | Signatur (vereinfacht) | Chainable-Return |
|---|---|---|
| `plugin` | `(p: OakBunPluginLike)` — `Plugin<any, object>` | `FullstackAppBuilder<…>` |
| `use` | `(p: LiteForgePlugin \| () => LiteForgePlugin)` | `FullstackAppBuilder<…>` |
| `serverModules` | `<TMap>(modules: ServerModulesInput<…>)` | `FullstackAppBuilder<TContext, TMap, true>` |
| `mount` | `()` | `Promise<AppInstance>` — terminal |
| `listen` | `(port) \| (options: ListenOptions)` | `Promise<AppInstance>` — terminal |
| `build` | `(options: BuildOptions)` | `Promise<BuildResult>` — terminal |
| `dev` | `(options: DevOptions)` | `Promise<AppInstance>` — terminal |
| `$server` / `$ctx` | `readonly` phantom-types | — |

### 6.2 Overlap-Matrix (jede Method-Name-Zeile)

Legende: **OB** = OakBun-App, **LF** = aktueller LiteForge-`FullstackAppBuilder`.
"Konflikt?" nur wenn beide Seiten den Namen verwenden und die Semantik / Argument-Shapes inkompatibel sind.

| Method-Name | OB? | LF? | Gleiche Argument-Shape? | Konflikt? | Notizen |
|---|---|---|---|---|---|
| `plugin` | ✅ | ✅ | **Nein** — OB nimmt `Plugin<TCtx, TAdd>`, LF nimmt `OakBunPluginLike = Plugin<any, object>` | **Semantisch gleich, Typ-Erosion in LF.** | LF verliert `TAdd`-Inferenz. Bei Kandidat D: LF kann auf OBs Signatur gehoben werden (verbessert nur, bricht nichts). |
| `use` | ✅ | ✅ | **Nein** — OB nimmt `ServiceDef \| MiddlewareDef`, LF nimmt `LiteForgePlugin \| () => LiteForgePlugin` (Frontend-Runtime-Plugin aus `@liteforge/runtime`) | **Ja — harte Namens-Kollision.** | Gleicher Method-Name, fundamental unterschiedliche Typ-Welten. Siehe Sektion 6.3 für die drei Lösungs-Optionen. |
| `register` | ✅ | ❌ | — | Nein (noch nicht) | Muss für Kandidat D hinzukommen. Neuer Name, freier Slot. |
| `get / post / put / patch / delete` | ✅ | ❌ | — | Nein | Muss für Kandidat D hinzukommen. |
| `ws / registerWsAdapter` | ✅ | ❌ | — | Nein | Muss durch-delegieren. |
| `on / onEvent / events` | ✅ | ❌ | — | Nein | Muss durch-delegieren. |
| `cron` | ✅ | ❌ | — | Nein | Muss durch-delegieren. |
| `onError / onRequest / onBeforeHandle / onResponse` | ✅ | ❌ | — | Nein | Muss durch-delegieren. |
| `options` | ✅ | ❌ | — | **Latent** | OB's `.options({ validateResponse? })` wäre heute frei. LF könnte einen Konflikt einführen, wenn wir später selbst `.options()` als Builder-Method hätten. Nicht akut. |
| `close` | ✅ | ❌ | — | Nein | OBs `close()` ist terminal. LF hat `AppInstance.stop()` das intern `bunServer.stop()` ruft — semantisch identisch, anderer Namespace. |
| `getOpenApiSpec / getRoutes / printRoutes` | ✅ | ❌ | — | Nein | Introspection-Methoden, einfache Delegation. |
| `fetch` | ✅ | ❌ | — | Nein | Für Testing (createTestClient). Einfache Delegation. |
| `listen` | ✅ | ✅ | **Nein** — OB returned `Bun.Server`, LF returned `Promise<AppInstance>` mit Frontend-Bundle-Wiring | **Semantisch verschieden.** | LF's `listen` macht zusätzlich Bundling + Static-Asset-Registration + HMR-Wiring. OB's `listen` ist nur HTTP-Start. **Nicht Pass-Through-kompatibel** — LF muss eigene Semantik behalten. |
| `serverModules` | ❌ | ✅ | — | Nein | LiteForge-Extension. Kein OB-Pendant. |
| `mount / build / dev` | ❌ | ✅ | — | Nein | LiteForge-Extensions (Frontend-spezifisch). |

### 6.3 Kollisions-Details mit je drei Lösungs-Optionen

#### Kollision 1: `.use()` — Service/Middleware vs. LiteForgePlugin

**Status quo:**
- **OB `.use(service)`**: injiziert einen per-request Service in `ctx` (z.B. `ctx.users`). Typ-erweitert den Ctx.
- **OB `.use(middleware)`**: Middleware-Hooks anhängen.
- **LF `.use(plugin)`**: installiert einen **Frontend-Runtime-Plugin** (`LiteForgePlugin` aus `@liteforge/runtime`) in den Client-Runtime. Wird nur im `.mount()`-Pfad evaluiert, in `composeLiteForgePlugins` zusammengebaut. Hat **nichts** mit dem Server-Ctx zu tun.

Die Namens-Kollision existiert nur, weil beide Seiten historisch "use" als generischen "plug something in"-Verb gewählt haben. Es sind zwei völlig disjunkte Dimensionen: Server-Ctx-Injection vs. Client-Runtime-Plugin-Install.

**Drei Lösungs-Optionen:**

**(a) LF-Method umbenennen** — `.use()` auf LF-Seite umbenennen, z.B. zu `.client(plugin)` oder `.plugin(liteforgePlugin)` wenn `.plugin()` nicht schon anderweitig belegt wäre. Option konkret: `.usePlugin(liteforgePlugin)` wie im Prompt vorgeschlagen.
- **Vorteil**: saubere Trennung; OBs `.use()` kann 1:1 übernommen werden ohne Overload-Komplexität. Migration-Test passt (kein User würde `.use(liteforgePlugin)` in seiner OakBun-Migration erwarten, weil das nie in OakBun war).
- **Nachteil**: Breaking Change für alle bestehenden `.use(liteforgePlugin)`-Aufrufe in LiteForge-Code (`examples/starter-bun` und Tests). Dokumentation muss aktualisiert werden.

**(b) Overload mit Type-Discrimination** — EINE `.use()`-Method, die alle drei Argument-Typen akzeptiert: `ServiceDef | MiddlewareDef | LiteForgePlugin | (() => LiteForgePlugin)`. Runtime-Discriminator: ein `LiteForgePlugin` hat `install: (ctx) => …` Hook (mit `ctx.provide`), ein `ServiceDef` hat ein `_tag` / `_kind`, ein `MiddlewareDef` hat seine eigene Signatur.
- **Vorteil**: API-Oberfläche bleibt klein (ein Method-Name); existierende Aufrufe bleiben tippmäßig gültig; sowohl OakBun-Migration als auch bestehender LF-Code funktionieren ohne Änderung.
- **Nachteil**: Overload-Logik ist Runtime-Brittle. Wenn ein neuer OakBun-Input-Shape (z.B. zukünftige `PermissionDef`) die LF-Discrimination-Heuristik trifft, kippt die Routing. Typ-Overload mit 4 Branches wird schwer zu lesen.

**(c) OakBun-Namespace** — `.oakbun` Accessor-Property, die eine Facade auf die gewrappte OakBun-App freigibt: `builder.oakbun.use(service)`, `builder.oakbun.register(module)`. LF-Builder behält `.use(liteforgePlugin)` für Frontend-Plugins.
- **Vorteil**: Klare visuelle Trennung; LF-Builder bleibt stabil. Kein Typ-Overload-Risiko.
- **Nachteil**: **User-Migrations-Test bricht** — wer `createApp().use(service)` hatte, muss zu `defineApp({...}).oakbun.use(service)` umschreiben. Verletzt die Step-1.6-Prämisse. Außerdem: OakBun-Entities werden zweiter-Klasse, was der "Superset"-Idee widerspricht.

#### Kollision 2: `.plugin()` — OB-Plugin mit/ohne TAdd-Inferenz

**Status quo:**
- **OB `.plugin<TAdd>(p: Plugin<TCtx, TAdd>)`**: erweitert den Ctx typisiert um `TAdd`.
- **LF `.plugin(p: OakBunPluginLike)`** mit `OakBunPluginLike = Plugin<any, object>`: schluckt `TAdd` zu `object`. Typ-Flow verloren.

Kein semantischer Konflikt — beide Seiten meinen dasselbe (OakBun-Plugin registrieren). Aber LFs Signatur ist **strikt schwächer**. Bei Kandidat D ist das kein Dilemma, nur ein "pflicht-zu-heben"-Punkt.

**Drei Lösungs-Optionen:**

**(a) Signatur auf OB-Niveau heben** — `plugin<TAdd>(p: Plugin<TCtx, TAdd>): FullstackAppBuilder<…, TCtx & TAdd, …>`. Identisch zu OBs Shape, Typ-Flow propagiert durch den Builder.
- **Vorteil**: Superset-Semantik erfüllt. Existierende `.plugin(p)`-Aufrufe typen strikter, aber nicht weniger kompatibel.
- **Nachteil**: Erfordert, dass der Builder zwei zusätzliche Typ-Parameter trägt (`TCtx` und `TRoutes`), damit das Propagieren sich lohnt. Mehr Generic-Parameter auf `FullstackAppBuilder`.

**(b) Alias zu `.register()`** — `.plugin()` bleibt wie es ist (schluckt TAdd), und User bekommen Typ-Inferenz nur über einen neuen Weg (z.B. wenn `.register()` auch Plugins akzeptiert).
- **Vorteil**: Zero-Breaking.
- **Nachteil**: Zwei fast-identische Methoden. Violates Principle of Least Surprise.

**(c) Status quo** — LFs `.plugin(OakBunPluginLike)` unverändert lassen, Typ-Flow nur für `.serverModules()`-Kontext.
- **Vorteil**: Kleinste Änderung.
- **Nachteil**: Superset-Prämisse verletzt (User, der `createApp().plugin(jwtPlugin(...))` gewohnt ist und erwartet dass der Ctx `jwtUser` hat, sieht das nicht in LF).

#### Kollision 3 (latent): `.listen()` — Semantik-Divergenz

**Status quo:**
- **OB `listen(port, cb?, opts?): Bun.Server`** — startet nur den HTTP-Server, synchron returniert.
- **LF `listen(port) | listen(options): Promise<AppInstance>`** — bundelt zusätzlich den Client, registriert Static-Assets, aktiviert HMR (nicht hier, nur in `.dev()`), returniert einen `AppInstance` (inkl. `stop()`-Funktion).

Das ist **keine auflösbare** Kollision — die LF-Semantik ist strikt reicher und Frontend-gebunden. User, die `.listen(3000)` migrieren, bekommen automatisch das Frontend-Setup dazu; das ist gewollt.

**Drei Optionen:**

**(a) LF-Semantik übernehmen, OB durchreichen** — `.listen()` bleibt LF-Kontrolliert (wie heute), intern wird `bunServer = oakbunApp.listen(port)` gerufen. User bekommen immer das Frontend-Bundling dazu.
- **Vorteil**: Zero Breaking für LF-User. Step-1.6-Prämisse funktioniert (Migration from `createApp`): der User gewinnt Frontend, verliert nichts.
- **Nachteil**: User, der absolut KEIN Frontend will, muss `clientEntry` weglassen. Das ist bereits heute der Fall und semantisch OK.

**(b) Separate Methoden** — `.listen()` für "nur OakBun-Style" und `.serve()` für "inkl. Frontend-Bundle".
- **Vorteil**: Explizite Trennung.
- **Nachteil**: Bricht die Migration-Prämisse — `createApp().listen(3000)` würde in LF keine Frontend-Aktivität auslösen, was der "LiteForge _ist_ OakBun + Extensions"-Aussage widerspricht.

**(c) OB-Signatur 1:1 annehmen** — LF gibt `.listen()` in OBs Return-Shape zurück (`Bun.Server`), macht Frontend-Bundling über einen separaten impliziten Schritt (z.B. `clientEntry` triggert automatisch Pre-listen-Hook).
- **Vorteil**: Volle OB-Kompat.
- **Nachteil**: LFs `AppInstance` wird dann unerreichbar für User. Bricht `.stop()`, `.port`, `.$server`, `.$ctx`. Regression für bestehende Tests.

### 6.4 Neue Methoden, die Kandidat D hinzufügen müsste

Alle OB-Methoden, die **nicht kollidieren**, müssen als Pass-Through am Builder auftauchen, damit die Migration-Prämisse erfüllt ist:

- `.register(module)` — delegiert an `oakbunApp.register(module)`, Types propagieren `TRoutes & TModuleRoutes` durch den Builder.
- `.get / .post / .put / .patch / .delete(path, handler | schema, handler)` — pro Method 2 Overloads (plain + typed).
- `.ws(path, route)` + `.registerWsAdapter(adapter)`.
- `.on(event, handler)`, `.onEvent(table, event, handler)`, `.events(def)`.
- `.cron(def)`.
- `.onError`, `.onRequest`, `.onBeforeHandle`, `.onResponse`.
- `.fetch(req, server?)` — für Testing.
- `.close()` — reicht an OB durch (terminal). LF hat bereits `AppInstance.stop()`; die Überlappung ist harmlos weil beide "shutdown" bedeuten.
- `.getOpenApiSpec(opts?)`, `.getRoutes()`, `.printRoutes(opts?)`.
- `.options({ validateResponse? })` — latent kollidiert mit einem möglichen zukünftigen LF-Use; heute kein Konflikt.

### 6.5 Typ-Parameter-Explosion bei Kandidat D

Heute: `FullstackAppBuilder<TContext, TModules, TServerModulesCalled>` — **3 Generics**.

Für Kandidat D (Superset-Pass-Through mit propagiertem OakBun-Typ-Flow): `FullstackAppBuilder<TContext, TModules, TServerModulesCalled, TCtx, TRoutes, TPrefixes>` — **6 Generics**. Jeder OakBun-Method-Call, der den Ctx/Routes erweitert, muss alle anderen Generics durchreichen.

Das ist ein bekanntes Problem in OakBun selbst (`Veln<TCtx, TRoutes, TPrefixes>` hat 3 Generics, und jede Method ist eine Propagation-Übung). Es lässt sich handhaben, aber die `FullstackAppBuilder`-Interface-Definition wird lang.

---

## 7. Nächster Schritt (NICHT in dieser Phase)

Mit den obigen Fakten designen wir gemeinsam:
1. **API-Oberfläche unter Kandidat D**: Welche Kollisions-Option je Method (`.use`: a/b/c? `.plugin`: a/b/c? `.listen`: a/b/c?). Entscheidungen pro Zeile aus Sektion 6.
2. **Typ-Parameter-Explosion**: Wie tief wollen wir `TCtx`/`TRoutes`/`TPrefixes` durch den Builder schicken? All-in oder Opt-in über Helper-Types.
3. **Reihenfolge im `startServer`**: wann User-Module registrieren, Conflict-Detection vor/nach LiteForge-Reserved-Routes.
4. **URL-Space-Bereinigung**: `RESERVED_PREFIX` von `/api/` auf `/api/_rpc/` verengen; wie warnt man User-Routen-Kollisionen (heute keine Detection für `oakbun.register(m)`).
5. **Pass-Through-Mechanik**: Handwritten Interface vs. Proxy-basierte Delegation vs. Code-generiertes Boilerplate. Wartbarkeit bei OakBun-Upgrades (neue Methode → muss im Builder nachgezogen werden).
6. **Out of Scope für Step 1.6**: `getOpenApiSpec`-Integration als Feature, Server-Driven-Nav-UI, WS-Adapter-Hochtyp-Integration.

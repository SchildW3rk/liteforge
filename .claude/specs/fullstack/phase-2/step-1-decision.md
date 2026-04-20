# Architecture Decision: @liteforge/server Type Strategy
**Date:** 2026-04-20  
**Branch:** feat/server-rpc-foundation  
**Status:** FINAL — Lead approved

---

## Entscheidung

**Approach B3: Plugin-aggregiert + TypeScript-Inferenz über Record-Keys.**

```ts
// server/api.ts
export const api = liteforgeServer({
  modules: {
    greetings: greetingsModule,
    invoices:  invoicesModule,
  },
})
export type Api = InferServerApi<typeof api>

// app.ts
app.plugin(api)

// client component
import type { Api } from '~/server/api'
const server = useServer<Api>()
await server.greetings.hello({ name: 'René' })
```

---

## Die vollständige Geschichte (damit in 6 Monaten noch nachvollziehbar)

### Phase 1: Drei Approaches aufgestellt

Die Kern-Design-Frage war: Wie kommen die Server-Handler-Types zum Client — ohne Server-Code im Client-Bundle, ohne Codegen-Drift, mit voller IDE-Unterstützung?

**Approach A — Statische Codegen:**  
`liteforgeServer({ generateTypes: { outDir: './node_modules/.liteforge' } })` schreibt beim Build eine `.d.ts`-Datei. Client importiert `import type { ServerApi } from '@liteforge/server/generated'`.

Initial attraktiv wegen "sauberer Trennung zwischen Server und Client". Nachteil: Codegen muss vor Client-Build laufen (Race-Condition in parallelen Builds), generierter File ist gitignored (CI-Step nötig), tsconfig-Alias für den Pfad nötig, Types können driften wenn Codegen nicht läuft.

**Approach B — TypeScript-Inferenz über Export:**  
`export const api = liteforgeServer({ modules: [...] as const })` → `export type Api = InferServerApi<typeof api>`. Client importiert `import type { Api } from '~/server/api'`. Kein Codegen, kein Drift, sofortige IDE-Unterstützung, `import type` → zero runtime.

**Approach C — Auto-Discovery via Bun-Plugin:**  
Der `@liteforge/bun-plugin` scannt `*.server.ts`-Files und generiert ambient Declarations automatisch. `useServer()` ohne Type-Parameter.

Sofort als unzuverlässig identifiziert: `z.infer<>` existiert nur zur Compile-Zeit — ein Bun-Plugin kann diese Types nicht extrahieren ohne tsc oder ts-morph als Dependency (verletzt Zero-Dependencies-Regel und macht den Build 10× langsamer). Bei Codegen-Fehler: stilles Fallback auf `any`. Disqualifiziert.

**Initiale Einschätzung:** B > A >> C.

---

### Phase 2: TypeScript-Compile-Check

Die Spec-Anforderung war explizit: kein Pseudo-Code, echter Compiler-Check. Das war entscheidend.

**Beide Prototypen A und B schlugen fehl** mit identischem Fehler:

```
Type 'ServerFn<ZodObject<{name: ZodString}>, {greeting: string}, BaseCtx>'
is not assignable to type 'ServerFn<AnyZodObject, unknown, any>'
— The types of '_def.handler' are incompatible
```

**Root Cause:** Kontravariance bei Funktions-Parametern. Die Collection-Upper-Bound `FnsMap = Record<string, ServerFn<AnyZodObject, unknown, any>>` erzwingt eine Handler-Signatur `(input: {[x: string]: any}) => unknown`. Konkrete Fns haben aber `(input: {name: string}) => {greeting: string}` — TypeScript kann die spezifischere Funktion der weiteren Signature nicht zuweisen, weil Funktions-Parameter kontravariant sind.

**Fix:** Intern. Ersetze `ServerFn<AnyZodObject, unknown, any>` durch `ServerFn<any, any, any>` als Collection-Upper-Bound. `any` auf allen drei Slots deaktiviert die Kontravariance-Prüfung für den Container-Typ. Die *inferrierten* Types aus `InferServerApi<typeof api>` bleiben vollständig konkret — `any` ist nur in der internen Constraint-Definition, nie in der Output-API.

**Wichtig:** Das war Ausgang A (transparenter Fix, User-Code unverändert) — kein Approach-Wechsel nötig.

**Compile-Check nach Fix:** Null Fehler. Alle Tests grün:
- `r1.greeting: string` ✓ (nicht `unknown`)
- `server.greetings.hello({ name: 42 })` → Compile-Error ✓
- `server.greetings.hello({})` → Compile-Error ✓  
- `server.nonExistent` → Compile-Error ✓

---

### Phase 3: Re-Evaluation nach Compile-Check

Der Compile-Check hatte eine wichtige Konsequenz: **A und B sind strukturell äquivalent.** Identisches Problem, identischer Fix, identische Output-Type-Qualität. A's vermeintlicher Vorteil ("sauberere Trennung") hält nicht stand — er ist eine Illusion, die durch Codegen-Drift erkauft wird. A's Nachteile bleiben vollständig bestehen.

Damit reduzierte sich die Entscheidung auf: **Welche API-Form für `liteforgeServer({ modules: ... })`?**

---

### Phase 4: B1 vs B2 vs B3

Drei Varianten desselben Approach B — nur die `modules`-Parameter-Form unterscheidet sich.

**B1 — Array mit `as const`:**
```ts
liteforgeServer({ modules: [greetingsModule, invoicesModule] as const })
```
Problem: Vergisst der User `as const`, **degradiert der Type silently** — kein Fehler an der Problemstelle. `server.greetings.hello({ name: 42 })` wird ohne `as const` **akzeptiert** (Input-Typ wird zu `any`). Fehler erscheint erst downstream bei Verwendung des Return-Werts, ohne Hinweis auf die Ursache. K.O.-Kriterium: stille Type-Degradierung.

**B2 — Variadic:**
```ts
liteforgeServer({}, greetingsModule, invoicesModule)
```
TypeScript-seitig korrekt ohne `as const`. Aber: Config-Optionen (`cors`, `rpcPrefix`) erfordern ein explizites Config-Objekt als erstes Argument — das leere `{}` für den Default-Fall ist hässlich. Alternativ Chaining, aber das bricht das "Object-style APIs everywhere"-Pattern aus CLAUDE.md.

**B3 — Record:**
```ts
liteforgeServer({ modules: { greetings: greetingsModule, invoices: invoicesModule } })
```
Object-Literal-Keys werden von TypeScript **automatisch als Literal-Types inferiert** — kein `as const`, kein Workaround. Das ist TypeScript-Standardverhalten. Compile-Check: null Fehler, volle Type-Safety. Zusätzlicher Gewinn: der Record-Key wird zur Single Source of Truth für Namespace UND HTTP-Pfad.

| Kriterium | B1 | B2 | B3 |
|---|---|---|---|
| Types korrekt ohne Footgun | ❌ stille Degradierung | ✅ | ✅ |
| Config-Optionen ergonomisch | ✅ | ❌ | ✅ |
| Object-style API (CLAUDE.md) | ✅ | ❌ | ✅ |
| `as const` nötig | ja | nein | **nein** |
| Record-Key = HTTP-Pfad (SSOT) | nein | nein | **ja** |
| Compiler-verifiziert | ✅ | ✅ | ✅ |

**B3 gewinnt auf allen Achsen.**

---

## Finale API-Entscheidungen (Lead-approved)

### 1. Record-Key als Single Source of Truth für HTTP-Pfad

Der Record-Key in `modules: { greetings: greetingsModule }` bestimmt:
- Den Client-Namespace: `server.greetings.hello(...)`
- Den HTTP-Pfad: `POST /api/_rpc/greetings/hello`

Der String-Argument in `defineServerModule('greetings')` ist **redundant zum Record-Key**, bleibt aber als **Debug-Hint** erhalten — wertvoll für Logs und Error-Messages.

### 2. defineServerModule String-Argument: Debug-Hint mit Dev-Mode-Warnung

Convention: Der String-Argument in `defineServerModule()` sollte mit dem Record-Key übereinstimmen.

```ts
// Korrekt:
const greetingsModule = defineServerModule('greetings') // ← 'greetings' = Record-Key
// ...
liteforgeServer({ modules: { greetings: greetingsModule } })

// Falsch — Dev-Mode warnt:
const greetingsModule = defineServerModule('hello') // ← 'hello' ≠ 'greetings'
// ...
liteforgeServer({ modules: { greetings: greetingsModule } })
// → console.warn('[liteforge/server] Module debug name "hello" does not match key "greetings"')
```

Langfristig könnte `defineServerModule()` ohne String-Argument auskommen — aber für v1 bleibt es als dokumentierter Debug-Hint.

### 3. Type-Utility

```ts
import { liteforgeServer, type InferServerApi } from '@liteforge/server'

export const api = liteforgeServer({ modules: { greetings: greetingsModule } })
export type Api = InferServerApi<typeof api>
```

### 4. Client

```ts
import { serverClientPlugin } from '@liteforge/server/client'
import type { Api } from '~/server/api'

const { useServer } = serverClientPlugin<Api>({
  rpcPrefix: '/api/_rpc', // default, optional
  onError: (err) => { if (err.status === 401) navigate('/login') },
})

const server = useServer()
const result = await server.greetings.hello({ name: 'René' })
```

---

## Was bewusst ausgeschlossen wurde (und warum)

- **Codegen (Approach A):** Strukturell äquivalent zu B3, aber mit Drift-Risiko und CI-Komplexität. Kein Vorteil rechtfertigt den Overhead.
- **Auto-Discovery (Approach C):** `z.infer<>` ist Compile-Time — Extraktion zur Build-Zeit requires tsc/ts-morph, verletzt Zero-Dependencies-Regel, breaks silent bei Fehler.
- **`as const` (B1):** Stille Type-Degradierung bei vergessenem Keyword ist ein K.O.-Kriterium für ein Framework das "no any in public APIs" als Regel hat.
- **Variadic (B2):** Bricht Object-style-API-Pattern, Config-Ergonomie leidet.

---

## Prototyp-Dateien

Die verifizierten TypeScript-Prototypen liegen in `/tmp/`:
- `/tmp/approach-A/` — Approach A Prototyp
- `/tmp/approach-B/` — Approach B Prototyp  
- `/tmp/approach-C/` — Approach C Prototyp + Disqualifikations-Analyse
- `/tmp/ts-check/proof.ts` — Compiler-Proof für B (null Fehler nach Fix)
- `/tmp/ts-check/b-variants.ts` — B1/B2/B3 Vergleich (alle null Fehler)
- `/tmp/ts-check/b1-silent-demo.ts` — B1 stille Degradierung ohne `as const`

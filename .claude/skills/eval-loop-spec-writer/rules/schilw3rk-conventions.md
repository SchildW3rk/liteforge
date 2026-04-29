# SchildW3rk Konventionen — Quick Reference für Specs

> Vollständige Konventionen: siehe Root `CONVENTIONS.md` und `LESSONS.md`.

## Hard Rules (blockieren CI)

| Rule | Enforcement |
|------|-------------|
| Kein `any` | Biome `noExplicitAny: error` |
| Kein `as unknown as Foo` | Konvention + Code-Review |
| Kein `!`-Assertion | Biome `noNonNullAssertion: error` |
| <500 LOC in `src/*.ts` | `scripts/check-file-size.ts` |
| Kein `console.log` committed | Biome warning (wird error) |
| `index.ts` re-exportiert keine `_`-Symbole | `scripts/check-public-api.ts` |

**Einzige erlaubte `as`-Stelle:** JSON/Disk/Network Trust-Boundaries, mit optionalen Feldern:
```ts
const pkgJson = (await Bun.file(path).json()) as { name?: string };
```

## Visibility

1. Nicht exportiert: Default für file-internal Helpers.
2. `_prefix`: Cross-file internal Exports (Functions, Types, Constants).
3. `#private`: Klassen-interne Fields/Methods (Language-enforced).
4. `_internal/` Ordner: ab 5+ internen Symbolen pro Package.
5. `index.ts` re-exportiert nur non-underscore Symbole.
6. Underscore-Symbole nie in public API Signaturen — sonst Design-Smell.

## Runtime-Wahl

1. Bun-nativ (`Bun.file`, `Bun.Glob`, `Bun.spawn`, `Bun.write`)
2. Web Standards (`fetch`, `URL`, `Response`, `performance.now()`)
3. Node mit `node:` Prefix (`node:path`, `node:crypto`) — nie unprefixed

## TypeScript

Alle strict-Flags in `tsconfig.base.json` sind load-bearing. Nie schwächen per Package:
- `strict: true` + alle sub-flags
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `verbatimModuleSyntax: true`

## Commits

Conventional Commits mit Package-Scope:
- `feat(shell):`, `fix(shield):`, `chore(scripts):`, `docs:`, `refactor(shell):`, `test(shield):`

## Verify-Flow vor Commit

```bash
bun run typecheck
bun run check
bun run test
```

Alle drei müssen grün sein.

## Workspace-Setup

Jedes Package:
- `@schildw3rk/<name>` (scoped)
- `type: "module"`
- `publishConfig: { "access": "public" }`
- `repository.directory: "packages/<name>"`
- `main`/`types`: `./src/index.ts` (keine build-step nötig bei Bun)
- `tsconfig.json` extends `../../tsconfig.base.json`
- Ordner: `src/`, `tests/`, `README.md`

Interne Workspace-Deps: `workspace:*`, nicht `workspace:^`.

## Lessons nicht re-violaten

- **Typing-Lügen** → 42 Cast-Sites in LiteForge
- **Build-Tool-Assumptions** → Vite-spezifische `?url` Imports brachen in Bun
- **God-Classes** → OakBun's `app/index.ts` 1689 LOC (jetzt verhindert durch 500 LOC Limit)
- **Per-Request-Allokationen** → Lifecycle-Entscheidung immer vorher bewusst treffen
- **Hot-Path-Closures** → In hot paths statische Funktionen, nie per-iteration Closures
- **Legacy-Namen** → `Veln*` Ballast → vor 1.0 vollständig sweepen
- **Tagline-Violations** → "No magic" + `defineResource` Runtime-Magic war Widerspruch
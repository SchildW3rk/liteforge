# Spec: [Name des Features / Schritts]

> **Prompt-Anker:** _Stoppe nicht bis du zufrieden bist._

## Kontext

- **Projekt:** [LiteForge / OakBun / Kontor / ...]
- **Phase:** [z.B. Phase 2 Step 1 — `@liteforge/server`]
- **Vorheriger Zustand:** [was ist aktuell? was läuft? welche Tests sind grün?]
- **Trigger:** [warum jetzt? welche Vorbedingung ist erfüllt?]

## Tool-Research

> Pflicht bei jungen Tools (<24 Monate Stable): Bun, Electrobun, frische Bun-Packages, experimentelle APIs. Entfällt bei React, Vite, TanStack, etc.

- Tool: [z.B. Bun]
- Aktuelle Version: [z.B. `bun --version` + `web_search` "bun latest release"]
- Relevante API-Docs: [Links zu offiziellen Docs, nicht zu Tutorials]
- Bekannte Issues die uns betreffen könnten: [GitHub-Issue-Links]

## Scope

- [ ] [Konkretes Deliverable 1]
- [ ] [Konkretes Deliverable 2]
- [ ] [Konkretes Deliverable 3]

### Out of Scope

- [Was NICHT in diese Spec gehört, auch wenn es naheliegend wäre]
- [Folge-Arbeit die in eigener Spec folgt]
- [Experimentelle Ideen die warten müssen]

## Approaches

> Mindestens 3 Approaches in `/tmp/approach-[A|B|C].md` (bzw. `.ts` bei API-Design).
>
> Bei API-Design: **echter TypeScript-Compile-Check**, nicht Pseudo-Code. Contravariance und Index-Signature-Issues werden sonst nicht sichtbar. 30min Prototyping spart einen Tag Debugging.

### Approach A: [Kurzer Name]

- **Idee:** [1-2 Sätze]
- **API-Skizze:**
  ```ts
  // minimal aber compile-fähig
  ```
- **Pros:** ...
- **Cons:** ...

### Approach B: [Kurzer Name]

- **Idee:** ...
- **API-Skizze:**
  ```ts
  ```
- **Pros:** ...
- **Cons:** ...

### Approach C: [Kurzer Name]

- **Idee:** ...
- **API-Skizze:**
  ```ts
  ```
- **Pros:** ...
- **Cons:** ...

### Vergleichs-Kriterien

1. **Typsicherheit** — geht was an `any` / `as` vorbei?
2. **DX** — wie fühlt sich die API an?
3. **Bundle-Impact** — wenn Runtime-Package relevant
4. **Framework-Konsistenz** — `define*` vs `create*` Muster respektiert?
5. **[Kontext-spezifisch]**

## Decision

> In `/tmp/DECISION.md` vor Implementation dokumentieren.

- **Gewählt:** Approach [A | B | C]
- **Begründung:** [konkret, nicht "fühlt sich besser an"]
- **Trade-offs die bewusst akzeptiert werden:** ...

## Phases

### Phase 1: [Name]

- [ ] Task 1.1
- [ ] Task 1.2
- **Exit-Kriterium:** [messbar, z.B. "1700+ Tests grün, tsc clean"]

### Phase 2: [Name]

- [ ] Task 2.1
- [ ] Task 2.2
- **Exit-Kriterium:** ...

### Phase 3: [Name]

- [ ] Task 3.1
- [ ] Task 3.2
- **Exit-Kriterium:** ...

## Definition of Done

- [ ] Alle Tests grün (`bun test` exit 0)
- [ ] `tsc --noEmit` clean, 0 Errors
- [ ] Keine `as any` / `@ts-ignore` / `@ts-expect-error` im Production-Code
- [ ] Keine Workarounds — Framework-Gaps sind Issues (Link: ...)
- [ ] Docs in `/docs` aktualisiert (falls public API)
- [ ] CHANGELOG.md Entry
- [ ] Manuelle Smoke-Tests: [konkrete Schritte]
- [ ] [Feature-spezifisch]

## Commits

Conventional Commits, pro Phase mind. einer, konkrete Titel:

1. `feat(paket): [knackige Zusammenfassung Phase 1]`
2. `test(paket): [Tests Phase 1]`
3. `feat(paket): [Phase 2]`
4. `docs(paket): [Docs-Update]`
5. `chore(paket): [Changelog, Version-Bump]`

## Risks

- **[Risk 1]:** [konkrete Stolperfalle, z.B. "Bun's `plugin()` hooks sind nicht idempotent — zweiter Lauf crasht"]
  - **Mitigation:** [...]
- **[Risk 2]:** [...]
  - **Mitigation:** [...]
- **[Risk 3]:** [...]
  - **Mitigation:** [...]

## MCP-Nutzung

> Wenn MCP-Server (mcp-schildw3rk für Docs-Search, etc.) relevant: hier vorab dokumentieren welche Tools wofür benutzt werden.

- `search_docs` für: ...
- `get_doc` für: ...

## Reality-Check Protocol

Bei Agent-Ausführung einfordern:

- Nach jeder Phase: **Commit-Hash** + `bun test` Output
- Bei "Tests grün": vollständiger Test-Output, keine Zusammenfassung
- Bei Branch-Switches/Merges: expliziter Reality-Check bevor weitergemacht wird
- Task-Listen alleine sind kein Beweis — Git/Tests/Build müssen bestätigen

---

> **Prompt-Anker:** _Stoppe nicht bis du zufrieden bist._
# Regeln für Refactoring-Specs

Diese Regeln gelten wenn die Spec ein **reines Refactoring** beschreibt — Code-Umbau ohne beabsichtigte Verhaltensänderung.

## Refactoring-Definition (strikt)

Reines Refactoring = Verhalten vor und nach ist **identisch beobachtbar**. Tests müssen 1:1 grün bleiben.

Wenn sich Verhalten ändert, ist es **kein** Refactoring sondern ein Feature/Fix und bekommt eigene Spec.

## Test-Camouflage — das wichtigste Anti-Pattern

Wenn während eines reinen Refactorings ein Test rot wird:

1. **Zuerst checken:** existierte der Test vor dem Refactoring **1:1** und war grün? (`git stash`, Tests laufen lassen, `git stash pop`)
2. Wenn **ja**: **Code fixen, nicht Test**. Der Test hat Recht. Das Refactoring hat Verhalten geändert.
3. Wenn **nein** (z.B. neuer Test, oder Test wurde mit geändert): gefährlich — separat validieren, ggf. aus dem Refactoring-Commit herausziehen.

**Nie** einen Test umschreiben damit er zum aktuellen Output passt. Das ist **Test-Camouflage** und kaschiert Regressions.

Typisches Muster das nicht passieren darf:

```diff
- expect(result).toBe("foo")
+ expect(result).toBe("bar")  // ← verdächtig, wenn nicht durch neue Requirements gedeckt
```

Rot-Alarm. Stoppen und Git-History checken.

## Test-Preservation

In der Spec explizit machen:

- [ ] Test-Count vor Refactoring: **N** Tests grün
- [ ] Test-Count nach Refactoring: **N** Tests grün (gleiche N)
- [ ] Kein Test wurde inhaltlich geändert (Bezeichnung, Assertion, Input)
- [ ] Falls Tests umbenannt/umstrukturiert: 1:1-Mapping dokumentiert

## Approach-Evaluation beim Refactoring

- Approach A/B/C sind **verschiedene Wege zum gleichen Ziel**
- Kriterien: Lesbarkeit, Kohäsion, Kopplung, Test-Stabilität
- **Nicht** in einem Refactoring: neue Features, Performance-Optimierung, API-Änderungen

Wenn während des Refactorings Feature-Ideen auftauchen → eigener Issue, eigene Spec danach. Scope-Creep ist bei Refactorings besonders gefährlich weil die Tests dich nicht mehr schützen.

## Commit-Disziplin

- Commit-Titel `refactor(paket): ...` — **nie** `feat` oder `fix` während Refactoring
- Pro Schritt ein Commit, bissig klein (reversibel)
- **Zwischen-Commits müssen Tests grün haben** — nie broken commits in einen Refactor-Branch
- `git bisect`-tauglich bleiben

## Reality-Check bei Agent-Refactorings

Wenn Agent meldet "Refactoring abgeschlossen, Tests grün":

1. **Commit-Hash** einfordern
2. `bun test` full output einfordern (nicht "passing")
3. **`git diff --stat HEAD~N HEAD`** anschauen — wurden Test-Files geändert? → rot
4. Stichprobe in geänderten Source-Files: wurde Verhalten subtil geändert?
5. Bei Unsicherheit: alten HEAD auschecken, Tests laufen, neuen HEAD auschecken, Tests laufen — Zahlen und Namen vergleichen

Task-Listen können "Refactoring clean" melden während heimlich ein Test angepasst wurde. Besonders bei großen Refactorings mit vielen Commits skeptisch sein.

## In die Refactoring-Spec aufnehmen

- **Baseline:** Test-Count, `tsc` Output, Bundle-Size (falls relevant) vor Start
- **Ziel-Baseline:** gleiche Zahlen nach Abschluss
- **Explicit Preservation:** "Alle N Tests bleiben 1:1 grün, keine Test-Änderung"
- **Scope-Begrenzung:** was wird umgebaut, was explizit nicht
- **Revertability:** kann man jeden Einzel-Commit reverten ohne Kaskaden?
- **Atomarität:** ist das Refactoring in eine Reihe kleiner Commits zerlegbar oder einen Rutsch?

## Typische Refactoring-Muster mit etablierten Gotchas

- **Type-Signatures ändern:** Contravariance-Fallen — echter `tsc --noEmit` Check, nicht nur Tests
- **Folder-Strukturen umstellen:** Import-Pfade — erst mit Codemod, dann manuell
- **API-Rename:** Deprecation-Layer einziehen, nicht direkt löschen wenn public
- **Fluent-Builder-Refactor (OakBun):** Generic-Inference nicht kaputt machen
- **Component-Extraction (LiteForge):** Reaktivität nicht verlieren, `untrack()` bewusst setzen
- **Database-Migration im Refactoring:** gehört **nicht** in ein Refactoring, eigene Spec
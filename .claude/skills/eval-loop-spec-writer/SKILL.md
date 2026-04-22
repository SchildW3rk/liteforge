---
name: eval-loop-spec-writer
description: Erstellt Implementation-Specs im Eval-Loop-Format für SchildW3rk-Framework-Arbeit (LiteForge, OakBun, Kontor). Auto-triggern bei Anfragen wie "Schreib eine Spec für [Feature/Package/Phase]", "Eval-Loop-Spec für ...", "Neues Package bauen — schreib die Spec", "Spec für Phase X Schritt Y". Nicht nutzen für triviale Bug-Fixes mit klarer Ursache, reine Config-Changes, Docs-Updates oder Tasks unter 2h.
---

# Eval-Loop-Spec-Writer

Dieser Skill erstellt Implementation-Specs im Format das für SchildW3rk-Framework-Arbeit etabliert ist. Das Format hat sich durch mehrere Phasen des LiteForge/OakBun-Baus bewährt und kapselt harte Lehren aus vorherigen Sessions.

## Wann diesen Skill verwenden

Verwenden bei Anfragen wie:
- "Schreib eine Spec für [Framework-Schritt]"
- "Ich brauche eine Eval-Loop-Spec für [Package/Feature/Refactoring]"
- "Spec für Phase X Schritt Y"
- "Neues Package bauen — schreib die Spec"

Nicht verwenden bei:
- Einfache To-Do-Listen oder Tasks unter 2 Stunden Aufwand
- Bug-Fixes mit klarer Ursache (Spec wäre Overkill)
- Pure Konfiguration-Änderungen
- Docs-Updates ohne Code-Änderung

## Workflow

1. **Kontext klären.** Welche Phase, welcher Schritt, welches Package? Falls unklar, fragen bevor geschrieben wird.
2. **Tool-Research bei jungen Tools.** Bei Tools <24 Monate Stable (Bun, Electrobun, frische Bun-Packages) expliziter Web-Research-Schritt mit Versionsnennung (z.B. "aktuell ist Bun 1.3.12") BEVOR Spec-Details festgezurrt werden. Modell-Wissen über solche Tools veraltet schnell.
3. **Format laden.** `templates/spec-template.md` ist die Struktur-Vorlage.
4. **Regeln einweben.** Je nach Spec-Art:
   - Feature-Spec → Standard-Template reicht
   - Bug-Hunt-Session → Regeln aus `rules/bug-hunting.md` in die Spec übernehmen
   - Pure Refactoring → `rules/refactoring-discipline.md` einweben (Test-Preservation!)
5. **Risiken identifizieren.** Spezifische Stolperfallen für das Framework/Tool nennen (z.B. Bun's Plugin-API-Lücken, TS-Transform-Reihenfolge, Signals-Reaktivität bei LiteForge, SQL-Builder-Contravariance bei OakBun).
6. **Reviewen.** Spec durchgehen: alle DoD-Items gedeckt? Out-of-Scope explizit? Approach-Kriterien konkret und messbar?

## Kern-Prinzipien die in jeder Spec stehen müssen

- **Prompt-Anker:** _"Stoppe nicht bis du zufrieden bist."_ — am Anfang und am Ende der Spec
- **Scope vs Out-of-Scope:** explizit getrennte Listen, keine implizite Scope-Expansion
- **Drei Approaches minimum** in `/tmp/approach-[A|B|C].md` (bzw. `.ts` bei Code-Design) bei Design-Fragen
- **Echter TS-Compile-Check im Prototyp**, nicht Pseudo-Code — Contravariance und Index-Signature-Issues werden sonst nicht sichtbar. 30min Prototyping spart einen Tag Debugging.
- **Decision mit Begründung** in `/tmp/DECISION.md` vor Implementation
- **Definition of Done** als Checkliste, nicht als Fließtext. Jedes Item muss messbar sein.
- **Commit-Strategie** vorab definieren mit konkreten Commit-Titeln (conventional commits)
- **Risk-Sektion mit 2-5 konkreten Stolperfallen** — nicht "könnte schwierig werden", sondern "Bun's `plugin()` hooks sind nicht idempotent wenn X"

## Vergleichs-Kriterien in Approach-Evaluation

Standard-Reihenfolge (je Kontext anpassen):

1. **Typsicherheit** — geht was an `any` oder `as` vorbei?
2. **DX** — wie fühlt sich die API an?
3. **Bundle-Impact** — wenn Runtime-Package
4. **Testbarkeit** — Unit + Integration getrennt?
5. **Framework-Konsistenz** — passt das zum etablierten `define*` vs `create*` Muster?

## Was beim Schreiben der Spec zu vermeiden ist

- Vage Erfolgs-Kriterien ("funktioniert gut") — stattdessen messbare Signale (z.B. "alle 1700+ Tests grün", "tsc --noEmit exit code 0")
- Offene Zeit-Schätzungen ohne Phasen-Breakdown
- "Und dann vielleicht noch X und Y" — Scope-Creep tötet Specs
- Fehlende Risk-Sektion — jede Spec hat 2-5 konkrete Stolperfallen
- Implementation-Details im Scope-Teil — Wie gehört in Phases, nicht in Scope
- Workarounds oder `as any` in DoD — wenn Framework-Lücke, dann Issue aufmachen und in Spec referenzieren

## Reality-Check bei Agent-Ausführung

Task-Listen können "done" zeigen während Git/Tests/Build das nicht bestätigen. Jede Spec enthält ein Reality-Check-Protokoll:

- Nach jeder Phase: **Commit-Hash einfordern**
- Bei "Tests grün": vollständiger `bun test` Output, keine Zusammenfassung
- Bei Branch-Switches, Merge-Conflicts, Phasen-Übergängen: expliziter Reality-Check bevor weitergemacht wird

## File-Struktur

```
eval-loop-spec-writer/
├── SKILL.md              ← dieses File
├── templates/
│   └── spec-template.md  ← Struktur-Vorlage
└── rules/
    ├── bug-hunting.md           ← für Bug-Fix-Specs
    └── refactoring-discipline.md ← für reine Refactorings
```
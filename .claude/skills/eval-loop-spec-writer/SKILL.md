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
2. **Format laden.** `templates/spec-template.md` ist die Struktur-Vorlage.
3. **Regeln einweben.** Relevante Sektionen aus `rules/bug-hunting.md` und `rules/refactoring-discipline.md` einfügen. **(Beide Files aktuell Stubs seit Verlust am 2026-04-20 — Kern-Prinzipien im Zweifel aus CLAUDE.md ziehen.)**
4. **Risiken identifizieren.** Spezifische Stolperfallen für das Framework/Tool nennen (z.B. Bun's Plugin-API-Lücken, TS-Transform-Reihenfolge).
5. **Reviewen.** Spec durchgehen ob alle DoD-Items gedeckt sind, ob Out-of-Scope explizit ist, ob Approach-Kriterien konkret sind.

## Kern-Prinzipien die in jeder Spec stehen müssen

- **Prompt-Anker:** _"Stoppe nicht bis du zufrieden bist."_ — am Anfang und am Ende
- **Scope vs Out-of-Scope:** explizit getrennte Listen, keine implizite Scope-Expansion
- **Drei Approaches minimum** in `/tmp/approach-[A|B|C].md` bei Design-Fragen
- **Decision mit Begründung** in `/tmp/DECISION.md` vor Implementation
- **Definition of Done** als Checkliste, nicht als Fließtext
- **MCP-Nutzung** vorab dokumentieren wenn relevant
- **Commit-Strategie** vorab definieren mit konkreten Commit-Titeln
- **Für junge Tools (< 24 Monate Stable):** expliziter Web-Research-Schritt mit konkreter Versionsnennung vor Spec-Entstehung

## Was beim Schreiben der Spec zu vermeiden ist

- Vage Erfolgs-Kriterien ("funktioniert gut") — stattdessen messbare Signale
- Offene Zeit-Schätzungen ohne Phasen-Breakdown
- "Und dann vielleicht noch X und Y" — Scope-Creep tötet Specs
- Fehlende Risk-Sektion — jede Spec hat 2-5 konkrete Stolperfallen
- Implementation-Details im Scope-Teil — Wie gehört in Phases, nicht in Scope

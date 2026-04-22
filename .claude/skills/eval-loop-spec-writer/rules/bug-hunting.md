# Regeln für Bug-Hunting-Specs

Diese Regeln gelten wenn die Spec einen Bug-Fix oder eine Session mit mehreren Bug-Fixes beschreibt (multi-cause bugs, Regressions, unklare Root-Causes).

## Vor dem Fix: Reproduktion

- Bug in einem fehlgeschlagenen Test reproduzieren **bevor** gefixt wird
- Kein "ich seh das Problem, ich fix es schnell" — erst Test, dann Fix, dann Test grün
- Bei multi-cause Bugs: jede vermutete Ursache eigener Test

## Multi-Hypothesis Loop bei unklarer Ursache

Wenn nicht klar ist warum ein Bug auftritt:

1. 2-3 Hypothesen in `/tmp/hypothesis-[A|B|C].md`
2. Pro Hypothese: welcher Test würde sie bestätigen/widerlegen?
3. Tests schreiben, laufen lassen
4. Gewinner-Hypothese in `/tmp/DECISION.md` festhalten
5. Fix basierend auf verifizierter Ursache

Nicht raten und hoffen.

## Root-Cause vs Symptom

- Symptom-Fix nur akzeptabel wenn Root-Cause explizit dokumentiert ist und eigener Issue existiert
- `catch (e) { /* swallow */ }` ist kein Fix
- `if (x == null) return` kann Symptom-Fix sein — dann dokumentieren warum `x` null sein kann und wo der echte Fix sitzt

## Red Tests während Bug-Hunt

Wenn während des Bug-Hunts ein anderer Test rot wird:

1. **Stoppen** — nicht weitermachen mit "fix ich später"
2. Check: war dieser Test vorher grün? (`git stash`, Tests laufen lassen, `git stash pop`)
3. Wenn ja: entweder Fix bricht anderes Feature (→ Fix rollback oder Approach wechseln) ODER Test war instabil (→ eigener Issue)
4. **Nie den Test umschreiben damit er wieder grün wird** — das ist Test-Camouflage (siehe `refactoring-discipline.md`)

## Reality-Check bei Agent-Bug-Fixes

Wenn Agent meldet "Bug gefixt":

- **Commit-Hash einfordern**
- Full Test-Output (nicht nur "Tests grün")
- Reproduktions-Test muss existieren und den Fix validieren
- `git diff` anschauen — wurden Tests angepasst? → rot
- Manuelle Verifikation bei UI-Bugs

Task-Listen können "done" zeigen während der Bug in Production weiter auftritt. Besonders bei "einfachen" Fixes skeptisch sein.

## In die Bug-Hunting-Spec aufnehmen

- **Reproduktions-Schritte** (wie triggert man den Bug)
- **Vermutete Ursache** + alternative Hypothesen
- **Betroffene Tests** — welche brechen aktuell? welche müssen neu?
- **Regression-Gefahr** — welche Bereiche müssen nach Fix erneut getestet werden?
- **Quick-Fix vs Proper-Fix** — wenn beides existiert, explizit benennen

## Typische Bug-Kategorien mit etablierten Mustern

- **Timezone-Bugs:** APP_TIMEZONE prüfen, UTC-Drift zu externen Services (Brevo/Stripe/etc.)
- **Migration-Bugs:** json→jsonb, Spalten-Types, Defaults bei existierenden Rows
- **Mail/Job-Iteration:** CourseDate-Loops, Scheduled-Jobs-Idempotenz
- **Reaktivität (LiteForge):** `untrack()` fehlt, Snapshot vs Getter, `load()` vs `useList()`
- **SQL-Layer (OakBun):** N+1 Detection, loadRelation, Contravariance in Builders
- **Auth (Better Auth):** JWT Bridge, Cookie-Domains bei Multi-Tenancy
- **Cloudflare/Edge:** Build-Config, Separate vitest.config, CORS (Trailing Slash!)
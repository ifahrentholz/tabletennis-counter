# Verifizierte Entwickler-Kommandos

Stand: 2026-09-09, HEAD `07071af` · Node v24.12.0 (npm 11.6.2) lokal ausgeführt;
`.nvmrc`/CI pinnen `22.13.0`. Jedes Kommando wurde genau einmal in diesem Repo
ausgeführt (`cwd` = Repo-Root).

| Zweck | Exakte Invocation | Status | Laufzeit |
|---|---|---|---|
| install | `npm ci` | ✅ pass | ~36.6 s |
| build (kein `build`-Script vorhanden) | `npx expo export --platform ios` | ✅ pass | ~5.1 s |
| single test | `npx jest src/domain/match.test.ts --ci` | ✅ pass | ~4.2 s (Jest intern: 1.14 s) |
| alle Tests | `npm test -- --ci` (= `jest --ci`) | ✅ pass — 10 Suites / 98 Tests | ~30.7 s |
| lint | `npm run lint` (= `expo lint`) | ✅ pass | ~3.5 s |
| format check | `npm run format:check` (= `prettier --check .`) | ❌ **failed** — exit 1, 3 Dateien mit Formatierungsabweichungen: `docs/adr/0007-match-list-entry-point.md`, `docs/adr/0008-safe-area-insets.md`, `src/screens/PointCounterScreen.tsx` | ~1.2 s |
| typecheck | `npm run typecheck` (= `tsc --noEmit`) | ✅ pass | ~1.6 s |
| dev-Server (nur Startfähigkeit) | `npx expo start` | ✅ pass — Metro startet, "Waiting on http://localhost:8081"; nach 12 s manuell gekillt, nicht durchlaufen lassen | Start < 12 s |
| e2e | — | Nicht auffindbar — kein Detox/Playwright/Maestro-Setup, kein `e2e`-Verzeichnis, kein e2e-Script in `package.json` (einziger Treffer war eine transitive Erwähnung in `package-lock.json`) | — |

Hinweis Build: Es existiert kein `build`-Script und kein `eas.json`. Als
funktionierender Ersatz wurde `npx expo export --platform ios` verifiziert
(Metro-Bundle, "Exported: dist"). Erzeugtes `dist/` wurde nach dem Test wieder
entfernt (ist in `.gitignore` Zeile 8 gelistet).

## CI-Gates

Quelle: `.github/workflows/ci.yml` (einziger Workflow, Trigger: `push` auf
`main` und alle `pull_request`). Job `test` läuft auf `ubuntu-latest`,
Node `22.13.0` (`actions/setup-node@v4`), in dieser Reihenfolge:

| Schritt (Workflow) | Kommando | Lokal verifiziert als |
|---|---|---|
| Install dependencies | `npm ci` | pass |
| Check formatting | `npm run format:check` | **failed** (aktueller Repo-Stand verletzt das Gate) |
| Lint | `npm run lint` | pass |
| Typecheck | `npm run typecheck` | pass |
| Test | `npm test -- --ci` | pass |

CI kennt kein Build- und kein e2e-Gate — nur Formatierung, Lint, Typecheck und
Unit/Component-Tests werden gegated.

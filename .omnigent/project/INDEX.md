# tabletennis-counter — Projektwissen

Mobile App zum Zählen von Tischtennis-Partien, on-device und offline.
Expo (Managed Workflow) + React Native + TypeScript (`strict`), npm, Node 22.13.0.
Eine reine Domain-Engine (`src/domain/match.ts`) hält die Hierarchie
**Match → Game/Spiel → Set/Satz → Punkt** inklusive Deuce-Regel, manuellen
Korrekturen und Einfrieren nach Matchende. Persistenz läuft über AsyncStorage
mit Autosave nach jeder Mutation; es gibt kein Backend und keinen Login.
Fünf Screens (Match-Liste, Setup, Live-Punktezähler, Spiele-Übersicht,
Satz-Übersicht) ohne Navigations-Framework — Routing ist eine Route-Union in
`App.tsx`. UI-Strings sind hartcodiert Deutsch, es gibt keine i18n-Schicht.
Tests sind Jest + React Native Testing Library, direkt neben dem Code.
Entscheidungen liegen als ADRs unter `docs/adr/`, Specs unter `docs/specs/`.

## Wo welche Fakten stehen

| Datei | Inhalt |
|---|---|
| `commands.md` | verifizierte lokale Kommandos (install, test, lint, typecheck, build, dev) + CI-Gates |
| `architecture.md` | Top-Level-Module, Entry Points, Schichten, Gefahrenzonen |
| `conventions.md` | wie hier Code geschrieben wird; Verweis auf CLAUDE.md / AGENTS.md |
| `domain.md` | ubiquitäre Sprache + inkonsistent verwendete Begriffe |
| `vcs.md` | VCS (GitHub) und Tracker (GitHub Issues), `gh`-CLI, Branch-/Commit-Konvention, Labels |

## Bekannter Zustand

- `npm run format:check` schlägt auf `main` fehl (3 Dateien) — CI-Gate rot,
  gemeldet vom `onboard-commands`-Explorer, bewusst nicht gefixt.
- Es existiert kein e2e-Setup.
- `src/appInfo.ts` und `src/PlaceholderScreen.tsx` sind laut ADR 0001 Lehrbeispiele;
  ob sie noch importiert werden, wurde nicht abschließend geprüft.

---
Onboarding-Stand: Commit `07071afb5fa5dbead45eeaf6865bde88e75822cd`, 2026-09-09.
Domain und Konventionen sind vom Menschen (ingo) bestätigt.

# Architektur — Tabletennis Counter

Expo/React-Native/TypeScript-App (kein Backend, kein Server, rein lokal/on-device).

## Entry Points
- `index.ts:1-8` — Expo-Bootstrap, ruft `registerRootComponent(App)`.
- `App.tsx:1-92` — App-Root. Enthält die einzige "Navigation": ein lokaler
  State-Machine-Router (`Route`-Union, kein react-navigation, siehe ADR 0004 §5),
  gewrappt in `SafeAreaProvider`.
- Screen-Kette (Navigationsstruktur, jede Stufe genau einen Schritt zurück):
  `MatchListScreen` (App-Startbildschirm, ADR 0007) → `SetupFormScreen` →
  `MatchDetailScreen` (Games-Übersicht) → `SetsOverviewScreen` → `PointCounterScreen`.

## Top-Level-Module unter `src/`
- `src/domain/` — reine, UI-unabhängige Scoring-Logik (Match/Game/Set-Hierarchie,
  Gewinnregeln); zustandslos, keine Seiteneffekte (`match.ts`).
- `src/persistence/` — On-Device-Speicherung der Match-Hierarchie via
  `@react-native-async-storage/async-storage`, Key-Value pro Match-ID, kein
  SQL/keine Migrations (`matchStore.ts`).
- `src/screens/` — Bildschirme/Views, je einer pro Route-Zustand; orchestrieren
  domain + persistence und rendern components.
- `src/components/` — wiederverwendbare, reine Präsentations-UI (Button,
  PlayerTag, RubberFace, ScoreNumeral, Screen, ScreenActionBar, WinnerBanner).
- `src/theme/` — einzige Quelle für Design-Tokens (Farben, Spacing, Radius,
  Typo) plus `useTheme`/`makeStyles`; Screens/Components halten keine
  Literalwerte.
- `src/appInfo.ts`, `src/PlaceholderScreen.tsx` — Altlasten aus dem
  Scaffolding-Ticket (#1), noch nicht entfernt, nicht mehr im Route-Graph
  von `App.tsx` eingebunden (Inferenz, nicht per Import-Suche verifiziert).

## Schichten & Abhängigkeitsrichtung
`components`/`theme` (Basis, keine internen Abhängigkeiten)
  ← `screens` (importieren domain, persistence, components, theme)
  ← `domain` wird von `persistence` importiert (persistence kennt domain, nicht umgekehrt)
  ← `App.tsx` kennt nur `screens` (Routing), keine direkten domain/persistence-Importe.
Abhängigkeitsrichtung strikt einwärts: UI → Domain, nie Domain → UI/Persistence.

## Dokumentation als Quelle
`docs/adr/0001…0009` (Architekturentscheidungen) und `docs/specs/` (fachliche
Spec) sind die maßgebliche Quelle für "warum"; Kommentare im Code verweisen
darauf.

## Gefahrenzonen (nicht anfassen / mit Vorsicht)
- `node_modules/`, `package-lock.json` — vendored/generiert, nie manuell editieren.
- `.expo/`, `expo-env.d.ts` (gitignored, aktuell nicht vorhanden), `/ios`, `/android`
  (gitignored generierte Native-Ordner) — Build-Artefakte, werden von Expo erzeugt.
- Migrations: keine vorhanden — `persistence/matchStore.ts` nutzt bewusst simplen
  Key-Value-Store statt SQL-Schema (siehe Kommentar dort + ADR 0003).
- Secrets/`.env*`: keine `.env`-Dateien im Repo gefunden (verifiziert per Suche);
  falls künftig nötig, gehören sie nicht ins Git (`.gitignore` deckt `.env*.local`).
- `.DS_Store`-Dateien (mehrfach vorhanden, z. B. Root, `src/`, `agents/`) — macOS-
  Artefakte, sollten ignoriert/nicht committed werden.
- `agents/`, `.agents/`, `.claude/` — Tooling-/Agent-Konfiguration, kein App-Code.
- `CHANGELOG.md` — wird pro Ticket gepflegt, nicht rückwirkend umschreiben.

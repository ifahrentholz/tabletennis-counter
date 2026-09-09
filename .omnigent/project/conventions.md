# Code Conventions (aus dem Code gelesen, Stand 2026-09-09)

Referenzen (nicht kopiert): `CLAUDE.md` (verweist per `@AGENTS.md` auf AGENTS.md) und
`AGENTS.md` (nur Hinweis, aktuelle Expo-v57-Docs vor dem Coden zu lesen — keine
Style-Regeln). `docs/adr/0001-project-scaffold.md` begründet Toolchain (Expo Managed,
Jest+RNTL, CI-Reihenfolge). Kein `.cursorrules` vorhanden.

## Dateilayout
- `src/domain/` reine Logik (`match.ts`), `src/persistence/` I/O (`matchStore.ts`),
  `src/screens/` Screens, `src/components/` UI-Bausteine, `src/theme/` Tokens.
- Ein File = ein Named Export gleichen Namens (`Button.tsx` → `Button`,
  `PointCounterScreen.tsx` → `PointCounterScreen`). Kein `index.ts`-Barrel pro Ordner
  außer `src/theme/index.ts` (bündelt Tokens/Hooks für Screens).
- Ausnahme: `src/PlaceholderScreen.tsx`, `src/appInfo.ts` liegen bewusst direkt unter
  `src/` als Lehrbeispiele (ADR 0001 §2), nicht in `screens/`.
- Kein Navigations-Framework: `App.tsx:9-14` routet über lokale `Route`-Union +
  `useState`, kein React Navigation (ADR 0004 §5, referenziert in `App.tsx:20`).

## Naming
- Komponenten/Screens: PascalCase, Datei = Exportname (`RubberFace.tsx`).
- Funktionen/Hooks: camelCase, Hooks mit `use`-Präfix (`useTheme`, `useStyles` via
  `makeStyles(...)`, `src/theme/makeStyles.ts:24`).
- Domain-Typen: PascalCase Interfaces (`MatchConfig`, `SetState`), Player als String-
  Union `'A' | 'B'` (`src/domain/match.ts:20`).
- Style-Objekt je Datei heißt `styles`, Sheet-Factory `useStyles`.

## Tests
- Liegen neben dem Code, nicht in eigenem `tests/`-Ordner: `Foo.tsx` + `Foo.test.tsx`
  (z. B. `MatchListScreen.tsx`/`.test.tsx`), `matchStore.ts`/`.test.ts`. Reine Domain-
  Tests ohne Rendering: `src/domain/match.test.ts`.
- Runner: Jest + `jest-expo`-Preset (`jest.config.js`); Component-Tests mit
  `@testing-library/react-native` (`render`, `screen`, `userEvent`) — Assertions auf
  sichtbares Verhalten/Rollen (`getByRole('button', {name: ...})`), nicht Internals.
- Stil: verschachtelte `describe`/`it`, Satz-artige `it('...')`-Titel
  (`MatchListScreen.test.tsx:61ff`). Helper wie `makeConfig()`, `seedMatch()` lokal je
  Testdatei, kein globales Test-Utils-Modul gefunden.
- Mocking: nur zwei globale Mocks in `jest.setup.js` (AsyncStorage In-Memory-Mock,
  `react-native-safe-area-context`-Mock). Einzeltests mocken gezielt per `jest.spyOn`
  (`Alert.alert`, `Date.now`, `MatchListScreen.test.tsx:24,66`),
  `afterEach(() => jest.restoreAllMocks())`.
- `any` nur in Test-Hilfscode für RN-Fiber-Internas (`SetupFormScreen.test.tsx:22`),
  nirgends im Produktionscode.

## Error Handling
- Lokale `try/catch` an UI-Boundaries gegen unhandled Promise-Rejections:
  `SetupFormScreen.tsx:71-89`, Fehler landet als deutscher User-Text in State
  (`saveError`), mit Kommentar zur Begründung.
- Domain-Layer: Guard-Return statt Exception für erwartete No-ops
  (`if (isMatchComplete(match)) return match;`), aber `RangeError` bei
  Programmierfehlern (`src/domain/match.ts:213`).
- Kein zentrales Error-Boundary/Logging gefunden (nicht auffindbar).

## State Management
- Kein Redux/Zustand/Context — nur `useState` pro Screen (Routing `App.tsx:31`,
  Formular-/Ladezustand z. B. `PointCounterScreen.tsx:66`).
- Autosave-Pattern: jede Domain-Mutation wird sofort per `saveMatch()` persistiert,
  kein expliziter Save-Button (`matchStore.ts:1-16`, `PointCounterScreen.tsx:83-87`).
- Domain-Objekte immutable: Mutatoren geben neue `Match`-Werte zurück, nie in-place
  (`src/domain/match.ts:1-9`).

## Styling
- Kein CSS/Styled-Components/Tailwind — `StyleSheet.create` über eigenen Hook
  `makeStyles(theme => ({...}))` je Datei, je Farbschema gecacht
  (`src/theme/makeStyles.ts`). Screens lesen nur Tokens (`space`, `radius`, `stroke`,
  `type`, `hit`) aus `src/theme`, keine literalen Farb-/Abstandswerte im Screen.

## i18n / UI-Sprache
- UI-Strings hartcodiert Deutsch, keine i18n-Lib (kein `i18n`/`react-intl`/
  `useTranslation` gefunden). Beispiele: `'Neues Match'`, `'Löschen'`,
  `'Match konnte nicht gespeichert werden...'` (`SetupFormScreen.tsx:89`,
  `MatchListScreen.test.tsx:24`). Code-Kommentare/JSDoc dagegen durchgängig Englisch.

## Typen
- `tsconfig.json` erweitert `expo/tsconfig.base` mit `"strict": true`. Type-only
  Importe konsequent per `import type` getrennt (`PointCounterScreen.tsx:44-45`).
  Kein `any` im Produktionscode. Domain-Config als enge Literal-Unions statt `number`
  (`pointsToWin: 11 | 21`, `src/domain/match.ts:23-27`).

## Abweichungen Code vs. Doku
- AGENTS.md/CLAUDE.md enthalten keine der obigen Konventionen — nur ein
  Expo-Versionshinweis, kein Style-Guide. Einzige konventionsrelevante Doku sind die
  ADRs unter `docs/adr/`, stichprobenartig deckungsgleich mit dem Code (ADR 0001).

# Ubiquitäre Sprache — Tischtennis-Zähler-App

## Glossar

- **Match** — eine komplette Partie zwischen Spieler A und B, besteht aus `games[]`; oberste Ebene der Hierarchie. `src/domain/match.ts:44-50`
- **Game** (code) / **Spiel** (UI/Spec) — Zwischenebene, besteht aus `sets[]`; gewonnen ab `setsToWinGame` gewonnenen Sätzen. `src/domain/match.ts:49-52`; UI-Label „Spiel {n}“ `src/screens/MatchDetailScreen.tsx:183`
- **Set** (code) / **Satz** (UI/Spec) — trackt den laufenden Punktestand zweier Spieler; gewonnen nach Deuce-Regel. `src/domain/match.ts:38-43`; UI-Label „Satz {n}“ `src/screens/SetsOverviewScreen.tsx:164`
- **Point/Punkt** — kleinste Zähleinheit, `PlayerScore` je Satz. `src/domain/match.ts:33-36`
- **Deuce** — Siegregel: Punktegrenze erreicht UND mind. 2 Punkte Vorsprung, sonst Weiterspielen. `docs/specs/tabletennis-counter.md:47`, `src/domain/match.ts:11`
- **Preset** — feste antippbare Auswahl für `pointsToWin`/`setsToWinGame`/`gamesToWinMatch`, kein Freitext. `docs/specs/tabletennis-counter.md:112-113`, `src/screens/SetupFormScreen.tsx:115` (`PresetGroup`)
- **Override** — manuelle Korrektur von `setsWon`/`gamesWon` ohne Neuberechnung des Siegers. `docs/adr/0002-scoring-domain-engine.md:65`, umgesetzt als `adjustGameSetsWon`/`adjustMatchGamesWon` `src/domain/match.ts:186,220`
- **Lock/read-only/freeze** — Match nach Sieg vollständig eingefroren, alle Mutatoren werden No-ops. `src/domain/match.ts:18-19` (Kommentar „frozen“), Gate-Funktion `isMatchComplete` `src/domain/match.ts:65`
- **Setup** — Konfigurationsscreen vor Matchstart (`SetupFormScreen`). `src/screens/SetupFormScreen.tsx:38`
- **Store/Persistence** — `matchStore.ts`, AsyncStorage-Wrapper um `Match` mit `id`/`updatedAt`, Autosave nach jeder Mutation. `src/persistence/matchStore.ts:1-20,33-40`
- **Overview** — Aggregat-Screens: „games overview“ (Screen 3, `MatchDetailScreen`) und „sets overview“ (Screen 4, `SetsOverviewScreen`). `src/screens/MatchDetailScreen.tsx:2`, `src/screens/SetsOverviewScreen.tsx:2`
- **Resume** — laufendes Match aus der Liste antippen und fortsetzen; kein eigener Funktionsname, nur Navigation. `src/screens/MatchListScreen.test.tsx:90` (describe „resume/read-only navigation“)

## Inkonsistent verwendet

1. **Game/Spiel vs. Satz/Set — Domänenhierarchie weicht bewusst von ITTF ab:** Die App führt eine zusätzliche „Spiele“-Ebene zwischen Satz und Match ein, die es im offiziellen Tischtennis-Regelwerk nicht gibt (dort zählen nur Sätze). Explizit dokumentiert in `docs/specs/tabletennis-counter.md:200-205` („Further Notes“).
2. **„Match Center“ doppelt belegt:** gleiches Label für zwei verschiedene Hierarchie-Ebenen — Match-Liste (`src/screens/MatchListScreen.tsx:103`, eyebrow) und Satz-/Spiel-Detail (`src/screens/SetsOverviewScreen.tsx:101`, heroLabel).
3. **Screen-3-Bezeichnung widersprüchlich:** Code/Spec nennen ihn „games overview“/„Spiele-Übersicht“ (`src/screens/MatchDetailScreen.tsx:2`, `docs/specs/tabletennis-counter.md:129`), sichtbarer UI-Text ist aber „Matchübersicht“ (`src/screens/MatchDetailScreen.tsx:99`).
4. **Sprachmischung innerhalb eines Screens:** `SetupFormScreen` zeigt englisches „Match Setup“/„Lineup“ neben deutschem „Neues Match“/„Spielformat“/„Spieler A“ (`src/screens/SetupFormScreen.tsx:99-143`); `MatchDetailScreen`/`SetsOverviewScreen` mischen deutsche Domänenbegriffe mit englischen Formatlabeln „Best of {n}“/„First to {n}“ (`src/screens/MatchDetailScreen.tsx:100`, `src/screens/SetsOverviewScreen.tsx:97`).
5. **„Override“ nur in Prosa/Tests, nicht im Code-Namen:** ADR/Spec/Tests sprechen von „(manual) overrides“ (`docs/adr/0002-scoring-domain-engine.md:65`, `src/domain/match.test.ts:218`, `docs/specs/tabletennis-counter.md:172` „Editier-Overrides“), die tatsächlichen Funktionen heißen `adjustGameSetsWon`/`adjustMatchGamesWon`.
6. **„Lock“-Konzept mit 5 verschiedenen Namen:** „lock enforcement“ (ADR-Titel, `docs/adr/0007-match-list-entry-point.md:5`), „Sperr-Logik“ (Spec, `docs/specs/tabletennis-counter.md:172`), „frozen“ (Code-Kommentar, `src/domain/match.ts:18`), „locks the whole hierarchy“ (Test-describe, `src/domain/match.test.ts:281`), „read-only“ (überall) — keines davon ist ein benanntes Flag/Modul im Code, nur `isMatchComplete`.
7. **Aufschlag(wechsel)/Seitenwechsel:** „Aufschlag“ taucht nur als visuelle Farbmetapher auf („Ball-Orange … Aufschlag, laufender Satz“, `docs/specs/design-pass-visual-overhaul.md:43`) und wird in ADR 0009 explizit als NICHT umgesetzt gelistet („6. Aufschlaglogik“ unter „Bewusst nicht geändert“, `docs/adr/0009-visual-design-system.md:145`). „Seitenwechsel“ ist im gesamten Repo nicht auffindbar (per Grep bestätigt, keine Treffer) — beide sind explizit Out-of-Scope laut `docs/specs/tabletennis-counter.md:194`.

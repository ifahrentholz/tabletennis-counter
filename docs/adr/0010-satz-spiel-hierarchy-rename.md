# 0010. Match-Hierarchie-Rename: Satz und Spiel tauschen die Plätze

- Status: Accepted
- Date: 2026-09-09
- Ticket: [#33 — Hierarchie-Benennung Match/Satz/Spiel korrigieren (vertauschte Ebenen)](https://github.com/ifahrentholz/tabletennis-counter/issues/33)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (führt die betroffenen
  Typen/Felder ein), [ADR 0004](0004-match-setup-form.md) (Setup-Presets),
  [ADR 0006](0006-games-sets-overview-edit-mode.md) (Screens 3/4),
  [ADR 0007](0007-match-list-entry-point.md) (Navigationsreihenfolge)

## Context

Seit ADR 0002 hieß die mittlere Hierarchie-Ebene mit den meisten Punkten
(Deuce-Level) im Code `Set`/„Satz" und die Ebene darüber, die mehrere davon
zusammenfasst, `Game`/„Spiel". Der Mensch hat das als fachlich vertauscht
identifiziert: korrekt ist, dass ein **Match** aus **Sätzen** besteht, ein
**Satz** aus **Spielen (Games)**, und ein **Spiel** aus **Punkten** — exakt
umgekehrt zur bisherigen Benennung. Konkret: der Zähler, der bisher „Spiel"
hieß und z. B. „6:3" anzeigte, war in Wahrheit der Satz-Zähler; die
durchnummerierte Ebene „Satz 1, Satz 2, Satz 3" waren in Wahrheit die Spiele
innerhalb eines Satzes.

Die Spiel-Logik selbst (Struktur, Regeln, Verschachtelungstiefe: Match →
Ebene 1 → Ebene 2 → Punkt) ändert sich durch diesen Tausch nicht — nur die
Bezeichner und Labels der beiden mittleren Ebenen wechseln die Plätze. Die
Punkt-Ebene und die Match-Ebene sind unberührt.

## Decisions

### 1. Domain-Typen tauschen die Namen, Struktur bleibt gleich

`src/domain/match.ts`:

- Der bisherige Typ `GameState` (`sets: SetState[]`, `setsWon`, `winner`) —
  die Ebene direkt unter `Match` — heißt jetzt `SetState` (`games:
GameState[]`, `gamesWon`, `winner`).
- Der bisherige Typ `SetState` (`points`, `pointLog`, `winner`) — die
  Punkt-leaf-Ebene — heißt jetzt `GameState`.
- `Match.games`/`Match.gamesWon` heißen jetzt `Match.sets`/`Match.setsWon`.

Das ist ein reiner Namenstausch zwischen zwei Typen gleicher Form; kein Feld
wurde hinzugefügt, entfernt oder umstrukturiert.

### 2. Config-Felder benennen jetzt die richtige Ebene

`MatchConfig.setsToWinGame` (Sätze, um ein Spiel zu gewinnen) hieß fachlich
falsch — der Schwellenwert zählte tatsächlich, wie viele der
Punkte-Leaf-Einheiten nötig sind, um die mittlere Ebene zu gewinnen. Er heißt
jetzt `gamesToWinSet` (Spiele, um einen Satz zu gewinnen). Analog wird
`gamesToWinMatch` zu `setsToWinMatch` (Sätze, um das Match zu gewinnen).
`pointsToWin` ist unverändert, da der Name keine der beiden vertauschten
Ebenen referenziert.

### 3. Funktionsnamen folgen der Ebene, die sie tatsächlich behandeln

`createSet`/`createGame`, `currentSetIndex`/`currentGameIndex`,
`setWinner`/`gameWinnerFrom`/`matchWinnerFrom` und die beiden manuellen
Override-Funktionen `adjustGameSetsWon`/`adjustMatchGamesWon` tauschen
entsprechend zu `createGame`/`createSet`, `currentGameIndex`/
`currentSetIndex`, `gameWinner`/`setWinnerFrom`/`matchWinnerFrom` und
`adjustSetGamesWon`/`adjustMatchSetsWon`. `matchWinnerFrom` behält ihren
Namen (Match-Ebene unberührt), nur ihr Parametername ändert sich von
`gamesWon`/`gamesToWinMatch` zu `setsWon`/`setsToWinMatch`.

### 4. Screens: Rollen von `MatchDetailScreen` und `SetsOverviewScreen` tauschen

`MatchDetailScreen` (screen 3) zeigte bisher die „games overview" (Liste der
`Match.games`, Label „Spiel {n}", Aggregat „Spiele"). Nach dem Tausch zeigt
sie dieselbe Struktur unter den korrekten Namen: die Sätze-Übersicht (Liste
von `Match.sets`, Label „Satz {n}", Aggregat „Sätze"). Die Datei/der
Komponentenname `MatchDetailScreen` trägt die Ebene nicht im Namen und bleibt
unverändert (siehe bekannte, separate Inkonsistenz „Screen-3-Bezeichnung
widersprüchlich" in `domain.md`, die dieses Ticket nicht behebt).

`SetsOverviewScreen` (screen 4) trug die Ebene explizit im Dateinamen, zeigte
aber nach dem Tausch die Spiele-Liste innerhalb eines Satzes — der Dateiname
wäre daher irreführend geblieben. Sie wird umbenannt zu
`GamesOverviewScreen` (`GamesOverviewScreen.tsx`/`.test.tsx`), mit `setIndex`
statt `gameIndex` als Prop und `adjustSetGamesWon` statt `adjustGameSetsWon`
intern.

`App.tsx`s Routing-Union tauscht entsprechend die Bedeutung der Routen-Keys
`setsOverview` (→ `MatchDetailScreen`) und `gamesOverview` (→
`GamesOverviewScreen`); die Navigationsreihenfolge und -tiefe (Match-Liste →
Setup → Übersicht A → Übersicht B → Punktezähler) bleibt identisch, nur
welche Übersicht zuerst kommt tauscht mit den Bezeichnern.

`PointCounterScreen`s lokale Helfer `currentGameOf`/`currentSetOf` tauschen
ebenfalls Namen und Rückgabewert; die beiden Sub-Score-Anzeigen „Spiele: n"/
„Sätze: n" bleiben textlich unverändert, sind jetzt aber an die jeweils
korrekte (vorher andersherum gebundene) Kennzahl gebunden.

### 5. UI-Strings: Labels binden jetzt an die richtige Ebene

Betroffen sind u. a. die drei Setup-Presets (`Punkte pro Satz` →
`Punkte pro Spiel`, `Sätze pro Spiel` → `Spiele pro Satz`, `Spiele pro Match`
→ `Sätze pro Match`), die `PlayerStandRow`-Labels auf beiden
Übersichts-Screens (`Spiele` ↔ `Sätze`), die Listen-Header- und
-Item-Beschriftungen (`Spielverlauf`/`Spiel {n}` ↔ `Satzverlauf`/`Satz {n}`)
sowie die „Best of"/„First to"-Formatangaben, die jetzt auf
`setsToWinMatch`/`gamesToWinSet` verweisen statt umgekehrt.

### 6. Bestehende persistierte Matches: kein Migrationscode, bewusst

`StoredMatch.match` wird 1:1 als JSON in AsyncStorage abgelegt (ADR 0003).
Ein vor diesem Ticket gespeichertes Match hat die Feldnamen `games`/
`gamesWon`/`setsWon`(auf Game-Ebene)/`setsToWinGame`/`gamesToWinMatch`; nach
diesem Ticket erwartet der Code `sets`/`setsWon`/`gamesWon`(auf Set-Ebene)/
`gamesToWinSet`/`setsToWinMatch`. Es gibt **keine** automatische Migration
oder Fallback-Lesepfad für alte Feldnamen.

**Begründung:** Es existiert kein Migrations-Mechanismus im Store (ADR 0003,
bewusst simpler Key-Value-Store) und keine Produktions-Nutzerbasis mit
echten Altdaten — die App ist unveröffentlicht, alle bisherigen Matches
stammen aus Entwicklung/Tests. Ein vor diesem Ticket gespeichertes Match wird
nach dem Update beim Laden (`getMatch`) zwar als `StoredMatch` geparst, aber
mit `undefined` an den umbenannten Feldern (`match.sets`,
`match.config.gamesToWinSet`, …), was in den Screens zu Laufzeitfehlern
führen würde (z. B. `match.sets.length` auf `undefined`). Diese Matches
müssen manuell gelöscht (Match-Liste → Löschen-Button) und neu angelegt
werden. Ein Migrationsschritt wäre eine reine Vorsichtsmaßnahme ohne
adressierbaren Bestand und hätte den Diff dieses Tickets ohne fachlichen
Nutzen vergrößert; sollte künftig echte Nutzerdaten existieren, ist eine
eigene Migrations-ADR fällig.

## Consequences

- Domain-, Persistenz- und Screen-Tests (`match.test.ts`,
  `matchStore.test.ts`, alle `*Screen.test.tsx`, `App.test.tsx`) sind auf die
  neuen Namen/Labels umgeschrieben; Testanzahl und Testtiefe sind
  unverändert (98 Tests vor und nach dem Rename).
- `src/screens/SetsOverviewScreen.{tsx,test.tsx}` existieren nicht mehr,
  ersetzt durch `src/screens/GamesOverviewScreen.{tsx,test.tsx}`.
- ADRs 0002, 0004, 0005, 0006, 0007, 0008 beschreiben die _damals_ korrekte
  (jetzt als vertauscht erkannte) Benennung bzw. längst entfernte Dateinamen
  und wurden nicht rückwirkend umgeschrieben, sondern um einen kurzen
  Nachtrag ergänzt, der auf dieses ADR verweist — sie bleiben als
  historisches Protokoll der jeweiligen Entscheidung gültig.
- Vor diesem Ticket gespeicherte Matches sind nach dem Update nicht mehr
  ladbar und müssen gelöscht/neu angelegt werden (siehe Decision 6).

## Nachtrag (2026-09-09, Review-Fix zu Decision 6)

Ein unabhängiges Review des Rename-Diffs hat gezeigt, dass der in Decision 6
beschriebene Recovery-Pfad ("manuell löschen über den Löschen-Button der
Match-Liste, dann neu anlegen") in der Praxis nicht begehbar war:
`MatchListScreen` las für jede Zeile ungeschützt `stored.match.setsWon.A`/
`.B`, sodass ein Alt-Datensatz (der auf Match-Ebene weiterhin `gamesWon`
statt `setsWon` hat, siehe Decision 6) die gesamte Liste mit einem
`TypeError` abstürzen ließ, bevor der Löschen-Button überhaupt sichtbar
war.

**Fix:** `MatchListScreen` erkennt jetzt zur Laufzeit per Shape-Check
(`isCompatible`, `src/screens/MatchListScreen.tsx`), ob
`stored.match.setsWon` die erwartete `{A, B}`-Form hat. Fehlt sie (Alt-
Datensatz), rendert die betroffene Zeile keinen Score und keine "Match
öffnen"-Aktion mehr, sondern nur die Spielernamen, einen Hinweistext und den
Löschen-Button — der über denselben Bestätigungsdialog wie jede andere Zeile
funktioniert. Damit ist Decision 6 jetzt tatsächlich umsetzbar, ohne deren
Grundentscheidung zu ändern: es gibt weiterhin **keine** automatische
Migration oder ein Fallback-Lesepfad, der einen Alt-Datensatz wieder
öffenbar machen würde (die tiefer verschachtelten `sets`/`games` bleiben
unlesbar) — behoben wurde ausschließlich das Absturzverhalten der Liste
selbst, damit der dokumentierte Lösch-Pfad erreichbar ist. Testgedeckt in
`src/screens/MatchListScreen.test.tsx` ("legacy data").

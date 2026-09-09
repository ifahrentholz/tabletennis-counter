# 0006. Games & sets overview + edit mode: real screens 3/4, shared stepper row, App-level route depth

- Status: Accepted
- Date: 2026-08-08
- Ticket: [#6 — Games & sets overview screens with navigation and manual edit mode](https://github.com/ifahrentholz/tabletennis-counter/issues/6)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (`adjustGameSetsWon`/
  `adjustMatchGamesWon`/`isMatchComplete`, consumed here for the first time),
  [ADR 0003](0003-persistence-layer.md) (`getMatch`/`saveMatch`, reused per
  screen), [ADR 0004](0004-match-setup-form.md) §5 (interim `Route` state
  machine, extended here), [ADR 0005](0005-live-point-counter.md) §1/§3
  (`PointCounterScreen`'s load/persist shape and its interim back-target,
  replaced here)

## Context

Tickets #2–#5 delivered the scoring engine, persistence layer, setup form,
and live point counter, but `MatchDetailScreen` (screen 3) was still the
`#4`/`#5` stub (`Match {matchId}` plus a direct "Punkte zählen" shortcut) and
screen 4 (sets overview) didn't exist at all. This ticket builds both real
overview screens, wires them into the point counter, and adds the
spec's manual edit mode (a +/- stepper that overwrites an aggregated
games/sets count without recalculating any winner), gated on the match not
yet being won. Ticket #7 (match list, resume/read-only, delete, lock
enforcement) remains explicitly out of scope.

## Decisions

### 1. `MatchDetailScreen` becomes the real games overview; a new `SetsOverviewScreen` is screen 4

`MatchDetailScreen`'s file/prop shape already declared itself as "screen 3"
(ADR 0004 §5), so it is rebuilt in place rather than renamed: it now loads
the match by id (mirroring `PointCounterScreen`'s own load/persist
round-trip, ADR 0005 §1), renders both players' `gamesWon`, and lists every
game so far. Tapping a game calls a new `onOpenSetsOverview(matchId,
gameIndex)` prop. The old direct "Punkte zählen" shortcut is removed — it
was explicitly interim scaffolding for reaching the point counter before #6
existed (ADR 0005 §3) and is now superseded by the real hierarchy.

`SetsOverviewScreen` is a new file with the same shape one level down: it
takes `matchId` **and** `gameIndex`, renders that specific game's
`setsWon`, and lists its sets. Tapping any set calls
`onOpenPointCounter(matchId)` — no set index, because of decision 3.

### 2. Tapping any set opens the same, single live point counter

The scoring engine (`../domain/match.ts`) only ever tracks one live
set/game across the whole match — `addPoint`/`undoPoint` act exclusively on
`match.games.at(-1)`'s last set (ADR 0002). There is no way to "resume"
scoring on an older, already-decided set. So `SetsOverviewScreen` doesn't
pass a set index to `onOpenPointCounter` at all: every set row, regardless
of which one was tapped, opens the one `PointCounterScreen` instance, which
keeps rendering whatever the engine currently considers current (ADR 0005
§2). This matches user story #17's "current/selected set" phrasing and
avoids inventing a per-set point counter the domain model has no support
for.

### 3. Back-button chain: point counter → sets overview → games overview → setup (interim)

`App.tsx`'s `Route` union grows two variants (`setsOverview`,
`pointCounter` now both carry `gameIndex`) so each back button can return to
the exact screen instance it came from, one level up, per the spec's
navigation contract:

- Point counter's `onBack` now routes to `setsOverview` for the same
  `matchId`/`gameIndex` it was opened from, replacing the ADR 0005 §3
  placeholder that went straight to the games overview.
- Sets overview's `onBack` routes to `gamesOverview` for the same
  `matchId`.
- Games overview's `onBack` routes to `setup`. There is no match list yet
  (#7), so "one level up" from screen 3 has no real target; `setup` is used
  as the closest existing screen, the same placeholder pattern ADR 0004 §5
  used for the sets-overview-shaped hole before this ticket filled it. This
  is expected to be replaced once #7 lands, not treated as a wrong call now.

None of these back buttons persist anything themselves — every mutation
already round-trips through `saveMatch` before it reaches state, matching
the spec's no-explicit-save decision (ADR 0003, ADR 0005 §4).

### 4. Edit mode: a shared `PlayerStandRow`, gated on `isMatchComplete`, delegating to the existing pure adjusters

Both overview screens need the same shape of UI — a player's name, an
aggregated count, and (in edit mode) a +/- stepper for it — so that's
factored into `src/screens/PlayerStandRow.tsx`, parameterized by a `label`
("Spiele" vs "Sätze") so accessible names stay unambiguous
(`"Spiele Alice"`/`"Sätze Alice"`, `"Spiele Alice +1"`/`"Sätze Alice +1"`).

Each screen keeps its own local `editing` boolean (toggled by a single
"Editieren"/"Fertig" button) and calls the domain layer's existing pure
adjusters directly — `adjustMatchGamesWon(match, player, delta)` from the
games overview, `adjustGameSetsWon(match, gameIndex, player, delta)` from
the sets overview — then `saveMatch`s the result immediately, exactly like
`PointCounterScreen`'s `applyAndPersist` shape. No new domain logic was
needed: #2 already implemented both adjusters (clamped at 0, no-op once
`isMatchComplete`, no recalculation of any winner) and already covers them
in `match.test.ts`; this ticket only had to wire them into UI. The
"Editieren" button itself is conditionally rendered on `!isMatchComplete(
match)` (not shown at all once the match is won, on both screens), matching
the spec's "editable only until the match is won" gate — including for the
sets overview of an _earlier, already-completed_ game, since the gate is
match-level, not game-level.

## Known follow-ups (non-blocking)

1. **`gameIndex`/array-index navigation has no bounds guard.** Both
   `MatchDetailScreen` and `SetsOverviewScreen` trust the `gameIndex` they're
   given (always produced by mapping over `match.games`/`game.sets` in this
   ticket's own UI) rather than defensively checking it against
   `match.games.length`, consistent with `PointCounterScreen`'s existing
   "trust the route" style (ADR 0005 §2 follow-up 2 already flags the
   sibling gap of no error state for a bad `matchId`).
2. **No visual distinction between a game/set that is "current" vs. already
   decided in the overview lists**, beyond the optional winner suffix. A
   player can't tell at a glance from the games/sets overview which set
   tapping will actually resume live (decision 2) without opening it.
3. **The games-overview "Editieren" toggle is a single mode for the whole
   screen**, not per-player — tapping "Editieren" reveals both players'
   steppers at once. This matches the spec's "a dedicated Editieren button"
   (singular) language but wasn't explicitly required to behave this way.
   More precisely, it is a single match-wide toggle rather than one per row
   (per-game on the games overview, per-set on the sets overview): editing
   one player's count doesn't let a screen show only that row's stepper.
4. **Games overview's back button routes to `setup`, not a real match
   list**, per decision 3 — an explicit interim placeholder, since #7 (the
   match list) doesn't exist yet. This is expected to be replaced once #7
   lands, not treated as a wrong call now.
5. **`MatchDetailScreen.tsx` and `SetsOverviewScreen.tsx` each define their
   own, near-identical `StyleSheet.create` block** rather than sharing one.
   The two screens have the same visual shape (decision 4), so their styles
   are a candidate for extraction into a shared `overviewStyles.ts` once a
   third consumer or a real design system makes the duplication worth
   removing.

None of these were required by the spec for #6; they're recorded here for a
future ticket (most plausibly #7, which introduces the match list and lock
enforcement) to address deliberately.

## Consequences

- `src/screens/MatchDetailScreen.tsx` is rebuilt as the real games overview;
  `src/screens/SetsOverviewScreen.tsx` and `src/screens/PlayerStandRow.tsx`
  are new.
- `App.tsx`'s `Route` union now has four variants and a four-deep back
  chain; the whole union is still expected to be replaced by a real
  navigation library once #7's match list needs its own stack entry point,
  per ADR 0004 §5's stated consequence.
- `PointCounterScreen` itself is unchanged except for its doc comment (no
  behavioral change) and the `onBack` target supplied by its caller.

## Nachtrag (siehe ADR 0010)

Dieses ADR benennt `MatchDetailScreen` als "games overview" (screen 3) und
`SetsOverviewScreen` als "sets overview" (screen 4), inklusive der Funktionen
`adjustMatchGamesWon`/`adjustGameSetsWon`. Das folgt der zum Zeitpunkt dieses
ADRs benutzten, später als vertauscht erkannten Hierarchie-Benennung. Seit
ADR 0010 zeigt `MatchDetailScreen` die Sätze-Übersicht (screen 3) und das
umbenannte `GamesOverviewScreen` (vormals `SetsOverviewScreen`) die
Spiele-Übersicht (screen 4); die Domain-Funktionen heißen jetzt
`adjustMatchSetsWon`/`adjustSetGamesWon`. Struktur, Verschachtelungstiefe und
Screen-Reihenfolge sind unverändert geblieben, nur die Bezeichner haben die
Plätze getauscht. Dieses ADR bleibt als historisches Protokoll der damaligen
Entscheidung unverändert.

# 0005. Live point counter: single continuous screen instance, engine-driven win cascade, interim direct route

- Status: Accepted
- Date: 2026-08-08
- Ticket: [#5 — Live point counter screen with automatic set/game/match win detection](https://github.com/ifahrentholz/tabletennis-counter/issues/5)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (`addPoint`/`undoPoint`/
  `isMatchComplete`, consumed here), [ADR 0003](0003-persistence-layer.md)
  (`getMatch`/`saveMatch`, consumed here), [ADR 0004](0004-match-setup-form.md)
  §5 (interim `Route` state machine, extended here)

## Context

Tickets #2–#4 delivered the scoring engine, persistence layer, and setup
form/routing stub, but no screen yet exercises the actual live-scoring path.
This ticket adds screen 5 (Satz-Detail/Punktezähler) — the +1/-1 point
counter with automatic set/game/match win detection (deuce included) — while
screens #6/#7 (games/sets overview, edit mode) remain out of scope.

## Decisions

### 1. `PointCounterScreen` owns its own load/persist round-trip

`PointCounterScreen` takes only `matchId` and `onBack`; it loads the match
itself via `getMatch` on mount and calls `saveMatch(updatedMatch, storedId)`
after every point/undo, mirroring `SetupFormScreen`'s "thin adapter over the
two existing pure modules" shape rather than lifting match state into `App`.
This keeps the point counter reachable from a single id, which matters
because the real games/sets overview (which would otherwise supply a
specific game/set) doesn't exist yet (see decision 3).

### 2. One continuous screen instance carries the player through the whole win cascade

`addPoint` (ADR 0002) already advances the engine's own "current game/current
set" pointer the instant a set or game is won — a new set (or game) is
appended to the `Match` value automatically, unless the match itself is now
complete. `PointCounterScreen` always renders whichever set/game the engine
currently considers current (`match.games.at(-1).sets.at(-1)`), so a single
mounted instance transparently carries the player from set 1 to set 2 to a
new game etc. without any navigation of its own — the visible score resets
to 0-0 as each new set starts. The screen never computes a set/game/match
winner itself; it only reflects `match.winner`/`isMatchComplete`.

One consequence worth calling out: because `addPoint`'s no-op behavior once
`isMatchComplete(match)` is true means the last visible set's `winner` is
non-null _only_ in that frozen, match-complete state (every earlier
set-complete/game-complete transition already advanced to a fresh, unwon
set), a single `isMatchComplete(match)` check is sufficient to decide
whether the +1/-1 buttons should be disabled — there is no intermediate
"set decided but game/match still open" state to render specially.

### 3. Interim direct route from `MatchDetailScreen`, not the real games/sets overview

Per the ticket's scope note, #6/#7's games/sets overview screens don't exist
yet. `MatchDetailScreen` (currently a stub, ADR 0004 §5) gets one minimal
addition: a "Punkte zählen" button that calls a new `onOpenPointCounter`
prop with the match id, and `App.tsx`'s `Route` union gains a
`{ screen: 'pointCounter', matchId }` variant. This is scaffolding, not the
real navigation hierarchy — there is no way yet to pick a specific historical
game/set, only "the match's current/active one" (decision 1 makes that the
only concept the screen needs anyway). `PointCounterScreen`'s `onBack` routes
back to `matchDetail`, matching the spec's "screen 5's back button goes to
the sets overview" one level up, using the current stub as that
placeholder.

### 4. No confirmation/save UI anywhere in the flow

Every point/undo already round-trips through `saveMatch` before the local
state update settles (decision 1), so there is no "Speichern" button, no
save confirmation, and `onBack` performs no save of its own — it is a pure
navigation callback, consistent with the spec's "no explicit save button
anywhere" decision and ADR 0003's autosave design.

## Known follow-ups (non-blocking)

Code review for this ticket surfaced three gaps that do not block the spec's
acceptance contract for #5, but are worth tracking as the point counter and
its surrounding navigation mature in later tickets:

1. **Per-player "-1" buttons undo the globally-last point, not necessarily
   that player's own last point.** `undoPoint` (ADR 0002) has no player
   argument by design — it always undoes whichever point was scored most
   recently, regardless of which player scored it. This matches the
   pre-existing domain contract from #2 and is arguably intended per the
   spec's user story #7, but `PointCounterScreen` renders two visually
   distinct per-player "-1" buttons that both perform this same global
   action; the screen-level ambiguity this creates when a player taps the
   _other_ player's "-1" button is not documented or covered by a test for
   the mismatched-button case.
2. **No error/empty state if `getMatch(matchId)` resolves to `null`.** A bad
   or stale `matchId` (e.g. a deleted match reached via a stale route) leaves
   the screen showing "Lade..." indefinitely, with no error message and no
   way to navigate back out.
3. **Possible lost-update race on rapid double-taps.** The +1/-1 buttons are
   not disabled while a `saveMatch` call from a previous tap is still in
   flight, so two taps in quick succession before the first state update
   commits could both read and mutate from the same stale `match` value,
   silently losing one of the two points.

None of these were required by the spec for #5; they're recorded here so a
future ticket can address them deliberately rather than rediscover them.

## Consequences

- `src/screens/PointCounterScreen.tsx` is the first UI consumer of
  `addPoint`, `undoPoint`, and `isMatchComplete`.
- `src/screens/MatchDetailScreen.tsx` gains an `onOpenPointCounter` prop and
  button; `App.tsx`'s `Route` union grows a third variant. Both remain
  expected to be replaced once a real navigation library and the full
  games/sets overview (#6/#7) land, per ADR 0004 §5's stated consequence.
- Component tests for `PointCounterScreen` query score displays via
  `accessibilityLabel` (`getByLabelText('Punktestand <name>')`) rather than
  by literal text content, since two players can legitimately show the same
  number (e.g. 0-0); `userEvent` remains the interaction convention (ADR
  0004 §6).

## Nachtrag (siehe ADR 0010)

Die hier benutzten Begriffe "set"/"game" (z. B. "games/sets overview",
"current set") folgen der zum Zeitpunkt dieses ADRs benutzten, später als
vertauscht erkannten Hierarchie-Benennung. Seit ADR 0010 ist die korrekte
Reihenfolge Match → Satz → Spiel → Punkt (vorher: Match → Spiel → Satz →
Punkt); wo dieses ADR "set" schreibt, ist nach dem Tausch "game" gemeint und
umgekehrt. Dieses ADR bleibt als historisches Protokoll der damaligen
Entscheidung unverändert.

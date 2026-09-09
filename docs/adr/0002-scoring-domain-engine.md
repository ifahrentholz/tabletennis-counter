# 0002. Scoring domain engine: pure data model, deuce rule, and freeze-on-completion

- Status: Accepted
- Date: 2026-08-07
- Ticket: [#2 — domain model & scoring engine](https://github.com/ifahrentholz/tabletennis-counter/issues/2)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0001](0001-project-scaffold.md) (test harness this module is the
  first real consumer of); ticket #3 (persistence, in parallel — see decision 6)

## Context

Ticket #1 scaffolded the app and test harness but deliberately shipped no
domain logic. This ticket adds that logic in `src/domain/match.ts`: the
`Match`/`GameState`/`SetState` model, point/set/game/match winner resolution
(including the official deuce rule), manual score overrides, undo, and the
"frozen after match end" behavior the spec requires. It is pure logic only —
nothing here is wired into a UI yet.

## Decisions

### 1. Pure, immutable, plain-data module — no classes, no side effects

`src/domain/match.ts` exports only plain interfaces (`Match`, `GameState`,
`SetState`, `PlayerScore`, `MatchConfig`) and functions. There are no classes,
no mutation of inputs (every mutator returns a new `Match`; unaffected
branches reuse existing references), and no dependency on persistence, time,
randomness, or any UI/React Native import. `Match` and its nested state are
plain JSON-serializable objects.

This is deliberate, per the spec's Testing Decisions: the scoring/domain
logic is called out as the highest-value test seam in the app, precisely
because it can be tested with plain Jest (no rendering, no mocks) if kept
pure and UI-independent. Every other consumer — persistence (ticket #3), UI
state (tickets #4-7) — treats `Match` as an immutable value they read and
replace, never a stateful object they call methods on.

### 2. Deuce rule: `pointsToWin` with a mandatory 2-point lead, uniformly for 11 or 21

A set's winner is resolved by `setWinner`: a player wins once their point
count is `>= pointsToWin` **and** their lead over the opponent is `>= 2`.
Below a 2-point lead, neither branch matches and the set simply continues —
there is no separate "deuce mode" flag or branch in the code. The same single
check applies whether `config.pointsToWin` is `11` or `21`, so 21-point games
observe the identical deuce behavior as 11-point games with no special-casing.

This was chosen over an explicit deuce/advantage state machine because the
lead-based inequality is already correct for arbitrarily long deuce rallies
without needing extra state, keeping `SetState` minimal (just `points`,
`pointLog`, `winner`).

### 3. Freeze-on-completion is enforced once, at every mutator's entry point

`isMatchComplete(match)` (`match.winner !== null`) is the single source of
truth for "the match is over." Every mutator — `addPoint`, `undoPoint`,
`adjustGameSetsWon`, `adjustMatchGamesWon` — checks it as its first statement
and returns the _same_ `match` reference unchanged if true, before touching
any nested state.

This satisfies the spec's "fully frozen after match end" requirement for the
entire hierarchy (match, every game, every set) with a single guard per
function, rather than needing separate frozen-checks at the game and set
levels. Once `match.winner` is set, no code path in this module can produce a
different `Match` value from it.

### 4. Manual overrides do not recalculate winners — they only overwrite the counter

`adjustGameSetsWon` (game-level `setsWon`) and `adjustMatchGamesWon`
(match-level `gamesWon`) change only the aggregated counter for the given
player, clamped at 0. Neither calls `gameWinnerFrom`/`matchWinnerFrom`
afterward, so an override can never itself flip `winner` at its own level or
cascade upward to a higher level.

This matches the spec directly: manual overrides are a corrective stepper for
the displayed count, not a re-simulation of the match. Consequence: it is
possible to use overrides to reach a `setsWon`/`gamesWon` value that would
"naturally" imply a winner, without the domain setting one — winner
transitions only ever happen through `addPoint`. Callers that want a winner
recorded after a manual correction should award a point rather than raise
this as a ticket, and future tickets should not treat this as a bug to fix.

### 5. Undo is structurally scoped to the current set via a per-set `pointLog`

`SetState.pointLog` records the order of points awarded in _that_ set only,
and `undoPoint` only ever reads/pops from `game.sets[currentSetIndex(game)]`
— the running set. Once a set is won, a new `SetState` (with its own empty
`pointLog`) is pushed and the completed set's array entry is never indexed
into by `undoPoint` again.

This means the spec's "cannot edit a completed set's point history" rule is
satisfied by construction: there is no code path in `undoPoint` that can
address a non-current set, rather than a runtime check that forbids it. The
only defensive check needed is `set.pointLog.length === 0`, which no-ops
when the current set has nothing left to undo.

### 6. Interface boundary with ticket #3: `Match` has no `id`/`updatedAt` by design — wrap, don't extend

`Match` intentionally carries no identity or timestamp fields; those concerns
belong to persistence, not scoring. This was flagged in code review as an
open design question and is recorded here explicitly so tickets #2 and #3
stay aligned:

**Decision:** ticket #3 (persistence) should introduce a wrapper type, e.g.

```ts
interface StoredMatch {
  id: string;
  updatedAt: string;
  match: Match;
}
```

rather than adding `id`/`updatedAt` fields onto `Match` itself or otherwise
changing this module's exported shape. `src/domain/match.ts`'s public
interface (`Match`, `MatchConfig`, `GameState`, `SetState`, and the exported
functions) should remain stable input/output for tickets #3 through #7 — it
is the seam persistence and UI both build on. If a future ticket finds a
genuine reason `Match` itself needs identity, that should be a new ADR
explaining why wrapping was insufficient, not a silent field addition.

### 7. Known minor asymmetry: `adjustGameSetsWon` throws on an invalid index; other mutators silently no-op

`adjustGameSetsWon` throws a `RangeError` when `gameIndex` is out of range
(`gameIndex < 0 || gameIndex >= match.games.length`). Every other mutator
(`addPoint`, `undoPoint`, `adjustMatchGamesWon`) has no equivalent
out-of-range input to reject and otherwise no-ops silently on
invalid/terminal state (e.g. calling any mutator after match completion, or
`undoPoint` with an empty `pointLog`).

This is intentional but inconsistent in _style_: one function fails loudly on
bad input, the others fail quietly. It is non-blocking and requires no action
in this ticket, but UI implementers (tickets #4-7) that call
`adjustGameSetsWon` with a stepper-derived `gameIndex` should be prepared to
catch/guard against `RangeError`, since it is the one mutator in this module
that can throw.

## Consequences

- The domain layer is fully unit-testable with plain Jest, no RNTL/rendering
  needed (`src/domain/match.test.ts`), matching ADR 0001's seam design.
- No UI in this repo consumes `src/domain/match.ts` yet — that starts with
  tickets #4-7.
- Ticket #3 must wrap `Match` (`StoredMatch`-style) rather than modify its
  shape; changing `Match`'s public shape after tickets #4-7 start consuming
  it would require a follow-up ADR.
- Manual overrides can desynchronize `setsWon`/`gamesWon` from what
  `addPoint` would have produced, by design; this is a known, accepted
  property of the override feature, not a bug.
- Future contributors calling `adjustGameSetsWon` must handle the possible
  `RangeError`; the other three mutators never throw.

## Nachtrag (siehe ADR 0010)

Die in diesem ADR beschriebenen Typ-/Feldnamen (`GameState`/`SetState`,
`setsToWinGame`/`gamesToWinMatch`, `adjustGameSetsWon`/`adjustMatchGamesWon`,
`setWinner`/`gameWinnerFrom`) spiegeln die zum Zeitpunkt dieses ADRs benutzte,
später als vertauscht erkannte Hierarchie-Benennung wider (Domäne meinte
Match → Spiel → Satz → Punkt, korrekt ist Match → Satz → Spiel → Punkt). Seit
ADR 0010 tragen `SetState`/`GameState`, `gamesToWinSet`/`setsToWinMatch` und
`adjustSetGamesWon`/`adjustMatchSetsWon` die richtigen Namen für dieselbe
Struktur und Logik. Dieses ADR bleibt als historisches Protokoll der
damaligen Entscheidung unverändert.

# 0004. Match setup form: tappable presets, free-text names, and interim App-level routing

- Status: Accepted
- Date: 2026-08-08
- Ticket: [#4 — Match setup form: presets, player names & match creation](https://github.com/ifahrentholz/tabletennis-counter/issues/4)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (`createMatch`/`MatchConfig`,
  consumed here for the first time), [ADR 0003](0003-persistence-layer.md)
  (`saveMatch`, consumed here for the first time)
- Updated: 2026-08-10 — Decision 7 added, resolving known follow-up 1 below;
  see [#12 — Setup form: re-entrancy guard on "Match starten"](https://github.com/ifahrentholz/tabletennis-counter/issues/12)

## Context

Tickets #2 and #3 delivered the scoring engine and persistence layer as
UI-independent modules with no consumer yet. This ticket adds the first real
screen — the setup form (screen 2 in the spec's navigation structure) — and
is therefore the first place `createMatch`/`saveMatch` get wired into the UI,
and the first place this repo needs any form of screen-to-screen navigation.

## Decisions

### 1. Presets are single-select radio groups, not free-text/steppers

Each of the three numeric settings (`pointsToWin`, `setsToWinGame`,
`gamesToWinMatch`) is rendered as a row of `Pressable`s with
`accessibilityRole="radio"` and `accessibilityState={{ checked }}`, wrapped in
a `View` with `accessibilityRole="radiogroup"`. This directly implements the
spec's "fixed, tappable options, no free-text number field" requirement, and
using the radio semantics means the selected preset is discoverable both to
screen readers and to tests via `getByRole('radio', { name, checked })`
instead of inspecting internal component state.

Each option's accessible name includes its group label (e.g. `"Sätze pro
Spiel 6"`, not just `"6"`) because `setsToWinGame` and `gamesToWinMatch` share
the value `3` as a valid option — an unqualified name would make `3` an
ambiguous accessible name/test query across two different groups.

### 2. Defaults: `pointsToWin` 11, `setsToWinGame` 6, `gamesToWinMatch` 3

The spec only mandates defaults for `setsToWinGame` (6) and `gamesToWinMatch`
(3); it does not specify a default point limit. `pointsToWin` defaults to 11
(the more common recreational table-tennis rule) so the form always submits a
complete, valid `MatchConfig` even if the player never touches a preset.

### 3. Player name fields: plain `TextInput`, `autoComplete="off"`, no persistence of names themselves

Per the spec's "no autocomplete, no suggestion list of previous names"
decision, the two name fields are uncontrolled-in-the-sense-of-no-suggestions
plain `TextInput`s with `autoComplete="off"` and `autoCorrect={false}`, backed
by local component state only. No previous match's `playerAName`/
`playerBName` is read to seed or suggest a value — this ticket does not add
any "recent players" list, matching the spec's explicit out-of-scope item.

### 4. "Match starten" calls `createMatch` then `saveMatch` directly, no intermediate draft state

`SetupFormScreen` builds a `MatchConfig` from its local state, calls
`createMatch(config)` (ADR 0002), then `await saveMatch(match)` (ADR 0003,
create path: no `id` passed) and forwards the resulting `StoredMatch.id` to
`onMatchCreated`. There is no separate "create then save" round trip through
any app-level store — the screen is a thin, single-purpose adapter between
the form fields and the two existing pure modules, consistent with those
modules' "callers treat `Match`/persistence as their own responsibility"
design.

### 5. Interim App-level routing instead of a navigation library

No screen 1 (match list) or navigation library exists yet in this repo, and
only screens 2 and a screen-3 stub exist after this ticket. Rather than adopt
a navigation library (e.g. React Navigation) now — a decision that affects
every future screen ticket (#5–#7) and deserves its own evaluation once more
of the navigation structure is known — `App.tsx` holds a small local
`Route` union (`{ screen: 'setup' } | { screen: 'matchDetail', matchId }`)
and switches between `SetupFormScreen` and `MatchDetailScreen` by re-rendering
based on that state. `SetupFormScreen` is unaware of navigation itself; it
only calls the `onMatchCreated(matchId)` callback it's given.

`MatchDetailScreen` is a minimal stub (`Match {matchId}`) — the real games
overview is out of scope for this ticket and lands in a follow-up.

**Consequence:** adopting a real navigation library later (needed once
screens #5–#7 introduce a deeper stack with back-navigation, per the spec) is
expected to replace this `Route` state machine in `App.tsx`; that migration
should get its own ADR when it happens, not be treated as this decision
having been wrong.

### 6. Component test seam: `userEvent`, not `fireEvent`, for interactions

While writing this ticket's tests it was discovered that
`@testing-library/react-native@14` + `react-native@0.86` + React 19 do not
reliably deliver `fireEvent.press`/`fireEvent.changeText` to component state
in this project's Jest environment — the underlying state update isn't
flushed synchronously, so assertions made immediately after `fireEvent.*`
observe the pre-interaction state. `@testing-library/react-native`'s
`userEvent` API (`const user = userEvent.setup(); await user.press(...)` /
`await user.type(...)`), which drives interactions through an async,
`act`-aware event queue, does not have this problem and is used throughout
`SetupFormScreen.test.tsx` and `App.test.tsx`.

**Consequence:** this is now the established interaction-testing convention
for this repo — future component tests that simulate a tap or text input
should use `userEvent`, not `fireEvent`, for the same reason.

### 7. Re-entrancy guard on "Match starten": a synchronous ref paired with reactive state (resolves known follow-up 1, [#12](https://github.com/ifahrentholz/tabletennis-counter/issues/12))

`handleStartMatch` now checks an `isSubmittingRef` at its very top and
returns immediately if it's already `true`, before doing anything else
synchronous or async; `isSubmitting` state disables (and, matching
`PointCounterScreen`'s existing disabled-button convention, dims via a
`buttonDisabled`/`opacity: 0.4` style) the "Match starten" `Pressable`
while `createMatch`+`saveMatch` are in flight. Both are reset in a `finally`
block, so the button returns to normal whether `saveMatch` resolves or
rejects (the rejection itself is unhandled beyond that reset — see known
follow-up 2 below, which this ticket does not address).

A ref, not just the `isSubmitting` state flag, guards the synchronous entry
point because a state-only guard cannot catch a rapid second tap: the
re-render that would flip the button's `disabled` prop happens after React
has already finished running the synchronous portion of a second
`handleStartMatch` call that started before that re-render. `isSubmittingRef`
is checked and set synchronously, so it closes that window; `isSubmitting`
state exists purely for the reactive UI (disabled prop + dimmed style), not
as the correctness guard itself. This ref+state pair was flagged in review
as looking like a duplicated concern and confirmed as intentional, not a
duplication smell: the two serve different jobs (synchronous correctness
vs. reactive rendering) that a single primitive can't cover in React.

Testing this required invoking the button's `onPress` handler directly
(via React's `unstable_fiber` escape hatch on the rendered host node) rather
than through `userEvent.press`, because `userEvent` cannot fire multiple
truly-concurrent presses against the same element — it serializes them,
which would never reproduce the race the guard exists for. This was also
flagged and accepted in review as a known, justified fragility:
`unstable_fiber` is explicitly unstable-named and could break across a
future React version bump, but there is no other way in this stack today to
simulate a genuine double-tap race in a component test. No follow-up ticket
was opened for either point; both are recorded here as accepted trade-offs
rather than gaps to fix.

## Known follow-ups (non-blocking)

Code review for this ticket surfaced three gaps that do not block the spec's
acceptance contract for #4, but are worth tracking as the setup flow matures
in later tickets:

1. ~~**No re-entrancy guard on "Match starten".**~~ **Resolved in
   [#12](https://github.com/ifahrentholz/tabletennis-counter/issues/12), see
   Decision 7 above.** The button did not disable
   itself (or otherwise guard against a second tap) while `createMatch`/
   `saveMatch` were in flight, so a rapid double-tap could persist two
   separate matches from a single submission.
2. **No error handling if `saveMatch` rejects.** `SetupFormScreen` awaits
   `saveMatch` but does not catch a rejection (e.g. an `AsyncStorage`
   failure); today that surfaces as an unhandled promise rejection instead
   of user-facing feedback.
3. **Empty player names are accepted.** Neither name field is validated
   before submission, so "Match starten" succeeds with a blank
   `playerAName`/`playerBName`.

None of these were required by the spec for #4; they're recorded here so a
future ticket can address them deliberately rather than rediscover them.

## Consequences

- `src/screens/SetupFormScreen.tsx` and `src/screens/MatchDetailScreen.tsx`
  are the first UI consumers of `src/domain/match.ts` and
  `src/persistence/matchStore.ts`.
- `App.tsx` now renders `SetupFormScreen` (previously `PlaceholderScreen`,
  which remains in the tree as an unused scaffolding example per ADR 0001
  and is not deleted by this ticket).
- Future tickets (#5–#7) that add the match list, games overview, sets
  overview and point counter should expect to replace `App.tsx`'s ad hoc
  `Route` state with a real navigator, per decision 5.
- `userEvent` (not `fireEvent`) is the convention for simulating interactions
  in RNTL component tests going forward, per decision 6.
- `SetupFormScreen.tsx` gains an `isSubmittingRef` + `isSubmitting` pair and
  a `buttonDisabled` style (decision 7, [#12](https://github.com/ifahrentholz/tabletennis-counter/issues/12));
  known follow-up 1 above is resolved. Known follow-ups 2 and 3 (error
  handling on a rejected `saveMatch`, empty player name validation) remain
  open for a future ticket.

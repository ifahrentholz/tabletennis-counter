# 0007. Match list as the app's entry point, promise-based delete confirmation, and closing #20's back-navigation gap

- Status: Accepted
- Date: 2026-08-10
- Ticket: [#7 — Match list with resume/read-only, delete & lock enforcement](https://github.com/ifahrentholz/tabletennis-counter/issues/7),
  also closes [#20 — games-overview back button routes to a placeholder, not the match list](https://github.com/ifahrentholz/tabletennis-counter/issues/20)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (`isMatchComplete`,
  reused here rather than reimplemented), [ADR 0003](0003-persistence-layer.md)
  (`listMatches`/`deleteMatch`, consumed here for the first time),
  [ADR 0004](0004-match-setup-form.md) §5 (interim `Route` state machine,
  extended here), [ADR 0006](0006-games-sets-overview-edit-mode.md) §3 /
  known-follow-up 4 (the `gamesOverview` → `setup` placeholder this ticket
  replaces)

## Context

Tickets #1–#6 built the scoring engine, persistence, setup form, live point
counter, and games/sets overview screens, but the app had no real entry
point: `App.tsx` booted straight into the setup form, and there was no way
to see or return to a previously started match. ADR 0006 §3 explicitly
named `setup` as an interim placeholder for the games-overview back button
"until #7 lands" (tracked as its known-follow-up 4, and separately filed as
issue #20 once #6 shipped). This ticket builds the real screen 1 (match
list) and, in the same PR, retires that placeholder.

## Decisions

### 1. `MatchListScreen` becomes the app's root route; `setup` is reached only via its "Neues Match" action

`App.tsx`'s `Route` union gains a `matchList` variant, and the initial
`useState<Route>` seed moves from `{ screen: 'setup' }` to
`{ screen: 'matchList' }`. This makes the match list screen 1 in practice as
well as in the spec's numbering — every session starts there, and the setup
form (screen 2) is now only reachable by tapping "Neues Match", not by
default. This is a pure `App.tsx` routing change; `SetupFormScreen` itself
is untouched.

`MatchListScreen` renders every match from `listMatches()`
([ADR 0003](0003-persistence-layer.md)) as-is, with no re-sorting of its
own — `listMatches` already returns most-recently-changed first, which is
also the order the spec calls for. Each row is labelled `"playerAName vs
playerBName"` with a `"Läuft"`/`"Beendet"` status hint, and tapping any row
— running or finished — calls `onOpenMatch`, landing on the same games
overview (`MatchDetailScreen`, screen 3) either way.

### 2. Read-only enforcement for finished matches is delegated entirely to the existing `isMatchComplete` gates — not reimplemented in the list

The spec requires that resuming a finished match from the list is
read-only. Rather than teaching `MatchListScreen` (or `App.tsx`'s routing)
its own notion of "locked", this ticket relies on the gates #2 and #6
already built: `isMatchComplete(match)` already hides the
"Editieren"/stepper controls on the games and sets overviews and would
already reject any point mutation at the domain layer
([ADR 0002](0002-scoring-domain-engine.md)). Since every route into those
screens — fresh from the list, or continuing from an already-open screen —
loads the same persisted `Match` and runs it through the same gate, a
finished match is read-only regardless of how it was reached. `
MatchListScreen` only surfaces the `"Beendet"` hint so a user can tell
before opening it; it does nothing to enforce the lock itself. This keeps
the lock as a single source of truth instead of a second copy of the same
condition in the list screen.

### 3. Delete confirmation: a native `Alert.alert`, resolved via a `Promise<boolean>`, added in a review fix-round

The first implementation (`00c0207`) called `deleteMatch` immediately on
tap, with no confirmation. Review on PR #24 flagged this as blocking
against the spec's explicit "with confirmation" requirement, and `62e43b2`
fixed it:

- `confirmDelete(label)` wraps `Alert.alert` in a `new Promise<boolean>`,
  resolving `true` from the destructive "Löschen" button's `onPress` and
  `false` from either the "Abbrechen" (`style: 'cancel'`) button's
  `onPress` **or** the alert's own `onDismiss` (tap-outside on iOS,
  hardware back on Android) — both cancellation paths converge on the same
  `resolve(false)`, so there is exactly one way to leave a match untouched
  and one way to delete it.
- `handleDelete` becomes `async`, `await`s `confirmDelete`, and only calls
  `deleteMatch` + updates local list state when it resolves `true`. Nothing
  happens on `false`.
- The alert names the match (`"Möchtest du „{label}" wirklich löschen?"`)
  so the confirmation itself confirms _which_ match is about to go, rather
  than a generic "delete this?" prompt.

Promise-wrapping was chosen over a callback or a second piece of screen
state (e.g. `pendingDeleteId`) because it lets `handleDelete` stay a single
straight-line `async` function — the calling code doesn't need to know
`Alert.alert` is callback-based, and no extra render-triggering state is
needed just to track "is a confirmation open".

### 4. Closes #20: `gamesOverview`'s back button now targets `matchList`, removing the ADR 0006 §3 placeholder

With screen 1 now real, `App.tsx`'s `gamesOverview` route's `onBack` moves
from `{ screen: 'setup' }` to `{ screen: 'matchList' }`, and the doc comment
explaining the old placeholder is removed along with it. This closes #20 in
the same PR as #7 rather than as a separate follow-up, since the fix is a
one-line consequence of #7 existing at all — there was no reason to defer
it to a second PR once this screen landed.

## Known follow-ups (non-blocking)

1. **No test exercises the `Alert` `onDismiss` (tap-outside / Android-back)
   cancel path**, even though `confirmDelete` explicitly handles it
   (`{ cancelable: true, onDismiss: () => resolve(false) }`, decision 3).
   `MatchListScreen.test.tsx`'s `stubDeleteConfirmation` helper only ever
   drives the two button `onPress` callbacks, never the alert's third
   options argument. Both cancellation paths share one code path
   (`resolve(false)`), so the risk of a real regression is low, but the
   `onDismiss` branch is currently unverified by any test.
2. **`confirmDelete` is redefined on every `MatchListScreen` render**, not
   memoized (no `useCallback`). Harmless in practice — it's cheap to
   construct and only used from an event handler — but a style nitpick
   worth a mention.
3. **The "3-set win for player A" test fixture is duplicated** between
   `MatchListScreen.test.tsx`'s `wonMatch()` and an equivalent inline loop
   in `App.test.tsx` (both construct a match via `createMatch` +
   `addPoint` in a `for` loop over 3 sets to reach a finished match for
   lock-enforcement assertions). A shared test helper (e.g. alongside
   `src/domain/match.ts`'s own test utilities, or a small
   `src/testUtils/` module) would remove the duplication.

None of these block #7 or #20. (1) and (2) are small enough not to warrant
their own ticket. (3) is also left un-ticketed for now — it's exactly two
call sites today, and per the "rule of three" this project's ADRs have
followed for similar style duplication (e.g. [ADR 0006](0006-games-sets-overview-edit-mode.md)
known-follow-up 5, on the two overview screens' near-identical
`StyleSheet.create` blocks), it's a better candidate for extraction the
next time a third test file needs the same fixture, or incidentally the
next time either of these two test files is touched for other reasons.

## Consequences

- `src/screens/MatchListScreen.tsx` and `src/screens/MatchListScreen.test.tsx`
  are new.
- `App.tsx`'s `Route` union gains a `matchList` variant and becomes the
  initial route; the `gamesOverview` → `setup` interim placeholder from
  ADR 0006 §3 is gone, and issue #20 is closed as a direct consequence.
- No changes to the domain engine (#2), persistence layer (#3), or the
  games/sets overview screens (#6) — this ticket only adds a new screen and
  rewires `App.tsx`'s routing around it, consuming existing public
  interfaces (`listMatches`, `deleteMatch`, `isMatchComplete`) exactly as
  designed.
- `App.tsx`'s local `Route` state machine is still not a real navigation
  library (per ADR 0004 §5's stated consequence); with the full five-screen
  hierarchy (list → setup → games overview → sets overview → point
  counter) now wired end to end, adopting a real navigation library remains
  a candidate follow-up but is not required by anything in this ticket.

## Nachtrag (siehe ADR 0010)

Die hier beschriebene Reihenfolge "games overview → sets overview" folgt der
zum Zeitpunkt dieses ADRs benutzten, später als vertauscht erkannten
Hierarchie-Benennung. Seit ADR 0010 lautet die Reihenfolge "sets overview →
games overview" (Match-Liste → Setup → Sätze-Übersicht → Spiele-Übersicht
→ Punktezähler); Navigationsstruktur und -tiefe sind unverändert. Dieses ADR
bleibt als historisches Protokoll der damaligen Entscheidung unverändert.

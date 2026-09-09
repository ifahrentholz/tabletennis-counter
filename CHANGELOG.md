# Changelog

All notable changes to this project are documented in this file.

This format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are in `YYYY-MM-DD`. This project has not yet made a versioned release,
so entries are grouped as `[Unreleased]` until the first tag.

## [Unreleased]

### Added

- Initial project scaffold ([#1](https://github.com/ifahrentholz/tabletennis-counter/issues/1)):
  - Expo (Managed Workflow) app skeleton targeting **iOS and Android only** —
    no web entry point.
  - TypeScript, ESLint and Prettier toolchain.
  - Jest (`jest-expo` preset) + `@testing-library/react-native` test harness,
    with one pure-logic unit test example and one component test example,
    establishing this repo's first test structure.
  - GitHub Actions CI running format check, lint, typecheck and test on
    every push to `main` and on every pull request. Requires **Node
    22.13.0+** (`^22.13.0 || >=24`); see `.nvmrc` and
    [ADR 0001](docs/adr/0001-project-scaffold.md) for why.
  - Project README covering setup, running on a simulator/device, and the
    test/lint/format scripts.

  No user-facing product behavior yet — the domain model and scoring engine
  (points, sets, games, matches, deuce rule) land in
  [#2](https://github.com/ifahrentholz/tabletennis-counter/issues/2) and
  follow-up tickets.

- Pure scoring domain engine ([#2](https://github.com/ifahrentholz/tabletennis-counter/issues/2)),
  in `src/domain/match.ts`:
  - `Match` / `GameState` / `SetState` data model and `createMatch`, covering
    the full point → set → game → match hierarchy as plain, immutable,
    JSON-serializable objects.
  - Point scoring (`addPoint`) with automatic set/game/match winner
    resolution, including the official deuce rule (win at `pointsToWin` with
    a minimum 2-point lead — identical for 11- and 21-point sets).
  - Undo (`undoPoint`), scoped to the currently running set only — completed
    sets' point history cannot be edited.
  - Manual overrides (`adjustGameSetsWon`, `adjustMatchGamesWon`) for
    correcting the aggregated set/game counters without recalculating
    winners.
  - Full lock after match completion: every mutator becomes a no-op once the
    match has a winner.

  See [ADR 0002](docs/adr/0002-scoring-domain-engine.md) for the design
  decisions behind this module, including the interface-boundary contract
  with the upcoming persistence work.

  This is logic only — not yet wired into any UI; that starts with
  follow-up tickets.

- Local persistence layer ([#3](https://github.com/ifahrentholz/tabletennis-counter/issues/3)),
  in `src/persistence/matchStore.ts`:
  - `StoredMatch` wraps the pure `Match` domain value with the `id` and
    `updatedAt` fields persistence needs, without changing `Match`'s own
    exported shape (per [ADR 0002](docs/adr/0002-scoring-domain-engine.md) §6).
  - Public interface: `listMatches`, `getMatch`, `saveMatch`, `deleteMatch` —
    on-device storage via `@react-native-async-storage/async-storage`, no
    backend/account/cloud-sync.
  - Autosave: `saveMatch` persists immediately and stamps `updatedAt`, so
    every state change (point, set, game, manual override) can be persisted
    the moment it happens — there is no explicit save step anywhere.
  - `listMatches` returns matches sorted by `updatedAt` descending (newest
    first), matching the match-list ordering the UI stories call for.

  See [ADR 0003](docs/adr/0003-persistence-layer.md) for the storage engine
  choice and interface design.

  This is a persistence module only — no UI screens consume it yet; that
  starts with follow-up tickets #4–#7.

- Match setup form ([#4](https://github.com/ifahrentholz/tabletennis-counter/issues/4)),
  in `src/screens/SetupFormScreen.tsx`:
  - Tappable, single-select presets for point limit per set (11/21),
    sets-per-game (3/5/6/7, default 6) and games-per-match (1/3/5, default 3) — no free-text number entry, so an invalid value can't be entered.
  - Free-text name fields for Player A and Player B, with no autocomplete
    and no suggestion/storage of previously used names.
  - A single "Match starten" button that creates the match
    (`createMatch`, [ADR 0002](docs/adr/0002-scoring-domain-engine.md)),
    persists it immediately (`saveMatch`,
    [ADR 0003](docs/adr/0003-persistence-layer.md)), and navigates into the
    newly created match.
  - `src/screens/MatchDetailScreen.tsx`: a minimal stub for the match
    detail / games overview screen (screen 3), enough to prove navigation
    lands on the correct match id; the real games overview lands in
    follow-up tickets.
  - `App.tsx` now renders the setup form (and, after a match is created,
    the detail stub) via a small local routing state, in place of the
    ticket #1 placeholder screen.

  See [ADR 0004](docs/adr/0004-match-setup-form.md) for the preset/testing
  design and the interim (non-library) routing decision.

  First UI wiring of the scoring engine and persistence layer end to end;
  the games/sets overview and live point counter land in #5–#7.

- Live point counter screen ([#5](https://github.com/ifahrentholz/tabletennis-counter/issues/5)),
  in `src/screens/PointCounterScreen.tsx`:
  - A "+1" and a "-1"/undo button per player, scoring the currently running
    set live via `addPoint`/`undoPoint`
    ([ADR 0002](docs/adr/0002-scoring-domain-engine.md)).
  - Automatic set win detection at the configured point limit with the
    official deuce rule (2-point lead), automatic game win once the
    configured number of sets is reached, and automatic match win (and
    match finalization) once the configured number of games is reached —
    all delegated entirely to the scoring engine; the screen only renders
    whatever the engine currently considers the current set/game.
  - Every point/undo is persisted immediately via `saveMatch`
    ([ADR 0003](docs/adr/0003-persistence-layer.md)) — no explicit save
    button anywhere in the flow.
  - A "Zurück" button navigates back to the match detail stub without
    saving (autosave already covers every state change).
  - `src/screens/MatchDetailScreen.tsx` gains a minimal "Punkte zählen"
    button and `App.tsx`'s routing gains a `pointCounter` route — interim
    scaffolding to reach the point counter's current/active set directly,
    since the real games/sets overview screens land in #6/#7.

  See [ADR 0005](docs/adr/0005-live-point-counter.md) for the single
  continuous-screen win-cascade design and the interim navigation decision.

- Games & sets overview screens with manual edit mode
  ([#6](https://github.com/ifahrentholz/tabletennis-counter/issues/6)):
  - `src/screens/MatchDetailScreen.tsx` is rebuilt as the real games overview
    (screen 3): both players' aggregated `gamesWon`, a list of every game
    played so far, and tapping a game opens its sets overview. The interim
    `#4`/`#5` stub (and its direct "Punkte zählen" shortcut) is gone.
  - `src/screens/SetsOverviewScreen.tsx` is a new screen 4: the same shape
    one level down — a specific game's `setsWon` per player and a list of
    its sets. Tapping any set opens the live point counter, since the
    scoring engine only ever tracks one current set/game across the whole
    match ([ADR 0002](docs/adr/0002-scoring-domain-engine.md)).
  - `src/screens/PlayerStandRow.tsx` is a new shared row component (player
    name + aggregated count, with an optional +/- stepper in edit mode)
    used by both overview screens.
  - A per-screen "Editieren"/"Fertig" toggle reveals +/- steppers that
    manually overwrite the aggregated games/sets counters via the existing
    `adjustMatchGamesWon`/`adjustGameSetsWon`
    ([ADR 0002](docs/adr/0002-scoring-domain-engine.md)) — without
    recalculating any winner — and persists immediately via `saveMatch`
    ([ADR 0003](docs/adr/0003-persistence-layer.md)). The toggle is hidden
    entirely once the match is won.
  - `App.tsx`'s routing gains `setsOverview` and `gameIndex`-carrying
    `pointCounter` variants, wiring up the full back-button chain: point
    counter → sets overview → games overview → setup (the last hop is an
    interim stand-in for the not-yet-built match list, #7).

  See [ADR 0006](docs/adr/0006-games-sets-overview-edit-mode.md) for the
  screen-split, single-point-counter, and edit-mode design decisions, and
  its "Known follow-ups" section for the non-blocking gaps this ticket
  leaves for #7.

- Match list as the app's entry point ([#7](https://github.com/ifahrentholz/tabletennis-counter/issues/7)),
  in `src/screens/MatchListScreen.tsx`:
  - Lists every persisted match (`listMatches`,
    [ADR 0003](docs/adr/0003-persistence-layer.md)), sorted
    most-recently-changed first, as `"playerAName vs playerBName"` with a
    `"Läuft"`/`"Beendet"` status hint per row.
  - Tapping any row — running or finished — resumes it via the existing
    games overview (`MatchDetailScreen`, #6); read-only enforcement for a
    finished match is not reimplemented here, it's inherited from the
    existing `isMatchComplete` gates on the games/sets overview and point
    counter screens ([ADR 0002](docs/adr/0002-scoring-domain-engine.md)),
    regardless of whether the match was reached fresh from this list or
    from a still-open screen.
  - Delete per row, gated behind a native `Alert.alert` confirmation
    (Abbrechen/Löschen, resolved via a promise so cancelling — or
    dismissing the alert — leaves the match untouched); only confirming
    calls the existing `deleteMatch`. This confirmation was added in a
    review fix-round after the initial version deleted immediately on tap.
  - A "Neues Match" action opens the setup form (#4).
  - `App.tsx`'s initial route is now the match list (previously the setup
    form); the setup form is reached only via "Neues Match".

  Also closes [#20](https://github.com/ifahrentholz/tabletennis-counter/issues/20):
  the games-overview back button now routes to this real match list
  instead of the interim `setup` placeholder called out in
  [ADR 0006](docs/adr/0006-games-sets-overview-edit-mode.md) §3/known-follow-up 4.

  See [ADR 0007](docs/adr/0007-match-list-entry-point.md) for the
  entry-point routing, the read-only-delegation, and the delete-confirmation
  design decisions, and its "Known follow-ups" section for non-blocking
  gaps left for future tickets.

### Fixed

- Re-entrancy guard on the setup form's "Match starten" button
  ([#12](https://github.com/ifahrentholz/tabletennis-counter/issues/12)),
  in `src/screens/SetupFormScreen.tsx`:
  - A synchronous `isSubmittingRef` check at the top of `handleStartMatch`
    now blocks a second invocation from starting a second
    `createMatch`/`saveMatch` round trip while the first is still in
    flight, closing the rapid double/triple-tap gap that could otherwise
    persist more than one match from a single submission.
  - The button itself now disables and dims (`buttonDisabled`, matching
    `PointCounterScreen`'s existing disabled-button style) while the
    create+save is in flight, and always re-enables afterwards — on
    success or on a rejected `saveMatch` — via a `finally` block.

  This closes known follow-up 1 from
  [ADR 0004](docs/adr/0004-match-setup-form.md) (see its new decision 7 for
  the ref-vs-state rationale and testing approach). Known follow-ups 2
  (no error handling if `saveMatch` rejects) and 3 (empty player names are
  accepted) remain open, unaddressed by this ticket.

- User-visible error on a failed match save
  ([#13](https://github.com/ifahrentholz/tabletennis-counter/issues/13)),
  in `src/screens/SetupFormScreen.tsx`:
  - `handleStartMatch` now catches a rejected `saveMatch` instead of letting
    it propagate, setting a `saveError` message that renders as an inline
    `Text` (`accessibilityRole="alert"`) below the "Match starten" button.
  - `saveError` is cleared at the start of every submission attempt, so the
    existing re-entrancy guard's button re-enable ([#12](https://github.com/ifahrentholz/tabletennis-counter/issues/12))
    is enough for the player to retry the same submission without leaving
    the screen — no extra "dismiss error" affordance was needed.
  - The `Pressable`'s `onPress` return value is never awaited by React
    Native, so a rejected `saveMatch` previously surfaced only as an
    unhandled promise rejection; catching it here removes that entirely.

  This closes known follow-up 2 from
  [ADR 0004](docs/adr/0004-match-setup-form.md) (see its new decision 8).
  Known follow-up 3 (empty player names are accepted) remains open,
  unaddressed by this ticket.

- Device safe-area insets on all 5 screens
  ([#27](https://github.com/ifahrentholz/tabletennis-counter/issues/27)):
  - Every screen's header row (e.g. `MatchListScreen`'s "Neues Match"
    button/title row) previously rendered underneath the notch/Dynamic
    Island on notched devices (found via manual QA on an iPhone 17 Pro
    simulator) because each screen's root was a plain `View` with a flat
    `padding: 24` that never accounted for device insets.
  - `App.tsx` now wraps its router in a single root `SafeAreaProvider`
    (`react-native-safe-area-context@~5.7.0`, added via `npx expo
install`), and each of the 5 screens' (`MatchListScreen`,
    `SetupFormScreen`, `MatchDetailScreen`, `SetsOverviewScreen`,
    `PointCounterScreen`) root elements — including their loading-state
    render, where they have one — changed from `View` to `SafeAreaView`.
  - `SafeAreaView`'s default additive edges only ever add to each screen's
    existing `padding: 24`, so a non-notched device's layout is unchanged.

  See [ADR 0008](docs/adr/0008-safe-area-insets.md) for the full decision
  record, including why `react-native-safe-area-context` and a root
  `SafeAreaView` were chosen over a hand-rolled inset heuristic, and an
  addendum recording the independent review's PASS verdict on both the
  Standards and Spec axes.

- Visual design system — the bat identity
  ([#29](https://github.com/ifahrentholz/tabletennis-counter/issues/29)):
  - The app had no design of its own: each of the 5 screen files carried its
    own `StyleSheet.create` repeating the same hex literals, and those values
    (`#16a34a`, `#dc2626`, `#1d4ed8`) were the Tailwind default palette.
  - New `src/theme/` is now the single source of truth (colour, spacing,
    radius, stroke, hit area and type scale for both colour schemes), and no
    screen file holds a literal colour any more.
  - Palette and signature element come from the physical material of the
    sport: a competition bat has one **red** and one **black** rubber, so
    player A is the red side and player B the black side, carried through
    every screen where both players appear; the surface is the deep
    blue-green of a competition table; ball orange appears **only** as a
    "this is where you are right now" marker (the running game/set).
  - Because red is now player identity, destructive controls (undo, delete)
    are de-coloured stamped labels rather than red, and the setup form's save
    error is called out by weight and a hard rule instead of by hue.
  - `PointCounterScreen` is treated as a piece of sports equipment rather
    than an app screen — the phone stands next to the table and is read from
    about a metre away. It is laid out as the table seen from above: two
    halves split by the centre line, each with a 92pt tabular-numeral score
    (previously 48pt) and one side of the bat as a 96pt-tall point-scoring
    face. Every control is at least 44×44pt.
  - Light **and** dark schemes follow the OS appearance setting via
    `useColorScheme()`; `app.json`'s `userInterfaceStyle` changed from
    `"light"` to `"automatic"`. Dark is not an inversion of light: in the
    light scheme the black side is drawn as contour and type, never as a
    filled area.
  - New purely presentational building blocks in `src/components/`
    (`Screen`, `Button`, `RubberFace`, `PlayerTag`, `ScoreNumeral`,
    `WinnerBanner`) — props in, view out, no state and no logic.
  - Two pieces of motion, both with the built-in `Animated` and both
    meaning-bearing: the score numeral lands when a point is awarded, and the
    winner banner fades in once at the moment the match is won. Nothing runs
    continuously.

  Presentation only: no change to behaviour, state, persistence, data flow,
  routing, form behaviour or user flows, no test edited, no new dependency.
  See [ADR 0009](docs/adr/0009-visual-design-system.md) for the full decision
  record, including the measured WCAG contrast ratios for both schemes and
  the follow-ups deliberately left alone.

- Corrected the Satz/Spiel hierarchy naming, which had been swapped
  throughout the app since [#2](https://github.com/ifahrentholz/tabletennis-counter/issues/2)
  ([#33](https://github.com/ifahrentholz/tabletennis-counter/issues/33)):
  - The two middle hierarchy levels traded names: a **Match** now consists of
    **Sätze (Sets)**, a **Satz** of **Spiele (Games)**, a **Spiel** of
    **Punkte** — previously it was the other way around. The point and match
    levels, the scoring rules, and the nesting depth are unchanged.
  - In `src/domain/match.ts`: `GameState`/`SetState` swap to `SetState`/
    `GameState`; `Match.games`/`gamesWon` become `Match.sets`/`setsWon`;
    `MatchConfig.setsToWinGame`/`gamesToWinMatch` become `gamesToWinSet`/
    `setsToWinMatch`; `adjustGameSetsWon`/`adjustMatchGamesWon` become
    `adjustSetGamesWon`/`adjustMatchSetsWon`.
  - `src/screens/SetsOverviewScreen.tsx` is renamed to
    `GamesOverviewScreen.tsx` (it now shows the games list within a set);
    `MatchDetailScreen` now shows the sets overview. `App.tsx`'s routing and
    all five screens' German labels (setup presets, overview headers,
    `PlayerStandRow` labels, the point counter's position readout and
    sub-scores) are updated to match.
  - No migration for previously saved matches — see
    [ADR 0010](docs/adr/0010-satz-spiel-hierarchy-rename.md) decision 6 for
    why, and how to recover (delete and re-create the match).

  See [ADR 0010](docs/adr/0010-satz-spiel-hierarchy-rename.md) for the full
  rename rationale and the addenda added to ADRs 0002, 0004, 0005, 0006 and
  0007, which keep their original text as a historical record.

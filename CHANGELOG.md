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

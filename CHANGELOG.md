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

# Tabletennis Counter

A mobile app (React Native via Expo, Managed Workflow) for keeping score
during table tennis matches — points, sets and games, following official
scoring rules (including deuce) — with local, on-device persistence.

Targets **iOS** and **Android** only; there is no web entry point.

This ticket (#1) provides the project scaffold only: an Expo app skeleton,
the TypeScript/ESLint/Prettier toolchain, a Jest + `@testing-library/react-native`
test harness, and CI. Domain logic, persistence and the real screens are
built in follow-up tickets (#2–#7).

## Requirements

- [Node.js](https://nodejs.org/) 22.13+ (LTS 22 or 24; see `.nvmrc`)
- npm 10+
- For running on a simulator/emulator:
  - iOS: Xcode + an iOS Simulator (macOS only), or the
    [Expo Go](https://expo.dev/go) app on a physical iPhone
  - Android: Android Studio + an Android emulator, or the
    [Expo Go](https://expo.dev/go) app on a physical Android device

## Install

```sh
npm install
```

## Run on a simulator/emulator or device

Start the Metro bundler and Expo dev tools:

```sh
npx expo start
```

Then, from the terminal UI that opens:

- press `i` to launch the iOS Simulator
- press `a` to launch the Android emulator
- or scan the QR code with the [Expo Go](https://expo.dev/go) app on a
  physical device

Shortcuts are also available directly:

```sh
npm run ios      # expo start --ios
npm run android  # expo start --android
```

There is no `web` script — this project does not target the web.

## Tests

Unit tests (pure logic) and component tests
(`@testing-library/react-native`) both run via Jest:

```sh
npm test
```

## Linting, formatting & type checking

```sh
npm run lint          # ESLint
npm run format:check  # Prettier check (use `npm run format` to auto-fix)
npm run typecheck      # TypeScript, no emit
```

## Continuous Integration

Every push and pull request runs formatting, lint, typecheck and tests via
GitHub Actions — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Documentation

- [`docs/specs/`](docs/specs/) — approved feature specs.
- [`docs/adr/`](docs/adr/) — architecture decision records (e.g. why Expo,
  why Jest + RNTL, the Node 22.13 pin).
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes per ticket.

## Project structure

```
App.tsx                  # App entry; local routing: match list -> setup ->
                          # games overview -> sets overview -> point counter
src/
  appInfo.ts              # Example pure-logic module (Jest unit test seam)
  PlaceholderScreen.tsx   # Unused ticket #1 scaffolding example (RNTL component test seam)
  domain/
    match.ts              # Pure scoring domain engine (Match/Game/Set)
  persistence/
    matchStore.ts         # On-device match persistence (list/get/save/delete)
  screens/
    MatchListScreen.tsx     # Match list (screen 1, app entry point): resume/
                            # delete matches, status hint, "Neues Match"
    SetupFormScreen.tsx     # Match setup form: presets, player names, "Match starten"
    MatchDetailScreen.tsx   # Games overview (screen 3): games list, per-player
                            # gamesWon, edit mode
    SetsOverviewScreen.tsx  # Sets overview (screen 4): a game's sets list,
                            # per-player setsWon, edit mode
    PlayerStandRow.tsx      # Shared player-name + count (+/- stepper in edit
                            # mode) row, used by both overview screens
    PointCounterScreen.tsx  # Live point counter (screen 5): +1/-1 scoring,
                            # automatic set/game/match win detection
```

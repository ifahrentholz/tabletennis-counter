# Tabletennis Counter

An app (React Native via Expo, Managed Workflow) for keeping score during
table tennis matches — points, sets and games, following official scoring
rules (including deuce) — with local, on-device persistence.

Runs on **iOS**, **Android** and in the **browser**, from a single codebase.
The web build is an installable, fully offline-capable PWA — see
[Web / PWA](#web--pwa) and [ADR 0010](docs/adr/0010-web-target-pwa.md).

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
npm run web      # expo start --web
```

## Web / PWA

### Development

```sh
npm run web
```

### Production build

```sh
npm run build:web
```

This exports the site to `dist/` and then generates a Workbox service worker
that precaches the whole app shell. Once installed, the app starts and counts
with no network connection at all.

The build is hosted on GitHub Pages under the `/tabletennis-counter/` subpath,
which is pinned in three places that must stay in step: `experiments.baseUrl`
in `app.json`, `start_url`/`scope`/`id` in `public/manifest.json`, and the
service worker registration path in `public/index.html`.

Pushing to `main` publishes the site via
[`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml). This
requires Pages to be set to **Source: GitHub Actions** once, under
Settings → Pages.

To preview a production build locally, serve `dist/` under the same subpath
the deployed site uses — the service worker's navigation fallback is an
absolute path and will not resolve if the build is served from the root:

```sh
npm run build:web
mkdir -p /tmp/tt-preview && ln -sfn "$PWD/dist" /tmp/tt-preview/tabletennis-counter
(cd /tmp/tt-preview && python3 -m http.server 8099)
# then open http://localhost:8099/tabletennis-counter/
```

### Installing on a phone

- **iOS:** open the site in Safari, then Share → _Zum Home-Bildschirm_. Safari
  shows no install prompt, so this step is manual.

  This is not optional if you want to keep your matches: Safari deletes
  script-writable storage after 7 days without interaction with a site, and
  **only home-screen web apps are exempt**. In a plain Safari tab, a match
  list can be cleared after a couple of weeks of not playing.

- **Android:** Chrome offers "App installieren" / "Zum Startbildschirm
  hinzufügen" by itself.

### Known web-only differences

The browser's back button does not navigate the app — navigation state lives
in React state, not in the URL (see
[ADR 0010](docs/adr/0010-web-target-pwa.md) §2). In standalone mode there is
no browser chrome, so this is invisible in normal use.

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
public/                   # Copied verbatim into the web build
  index.html              # HTML template for the SPA output: manifest link,
                          # iOS home-screen meta, service worker registration
  manifest.json           # Web app manifest (name, icons, standalone display)
  icons/                  # PWA icons incl. maskable and Apple touch icon
workbox-config.js         # Service worker generation for the web build
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

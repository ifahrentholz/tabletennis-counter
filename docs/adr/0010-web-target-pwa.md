# 0010. Web target as an installable PWA: Expo web alongside native, not a separate web app

- Status: Accepted
- Date: 2026-09-06
- Ticket: — (direct request; no tracker issue was filed for this change)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)

## Context

The spec's "Out of Scope" list closed with "Web-Zielplattform (nur iOS/Android
über Expo)", and ADR 0001 §1 set up the project with no web entry point at
all. That has now been reversed by an explicit product decision: the app
should also run in a browser and be installable to a phone's home screen,
with iOS named as the target device.

Two things made the reversal cheap to evaluate. First, the app's entire
React Native surface is `View`, `Text`, `Pressable`, `ScrollView`,
`TextInput`, `Animated`, `StyleSheet` and `useColorScheme` — every one of
which `react-native-web` implements. Second, the layers that carry the
actual behaviour are already platform-free: `src/domain/match.ts` is pure
TypeScript with no React Native import whatsoever, and
`@react-native-async-storage/async-storage@2.2.0` ships a web
implementation backed by `window.localStorage` (its native code sits in
`AsyncStorage.native.ts`, so the bundler resolves the web one automatically)
— meaning `src/persistence/matchStore.ts` needed no change either.

Exactly one API in the app had no web implementation: `Alert.alert`, used
for the match list's delete confirmation.

## Decisions

### 1. Expo's own web target, not a second web application

`npx expo install react-dom react-native-web @expo/metro-runtime` adds web
as a third platform to the existing project. The alternative considered was
rewriting the UI against React DOM (Vite + HTML/CSS), keeping only the
domain layer.

That alternative was rejected because it buys nothing here and costs a great
deal: all five screens, `src/theme/`'s token system, the seven presentational
components and the 98-test suite are written against React Native
primitives, and every one of them would have to be rewritten and re-verified
— while iOS and Android would simultaneously stop being deliverable from
this repository. Since the app uses only primitives that `react-native-web`
already covers, the single-codebase route ships the same product for a
fraction of the change surface, and native remains a first-class target.

### 2. `web.output: "single"` — a single-page app, not static or server rendering

Navigation is a local `useState` route machine in `App.tsx` (ADR 0004 §5,
ADR 0006, ADR 0007 §1), not a URL router. There are no routes to
pre-render per URL and no server to run API routes on, so the SPA output —
one `index.html` plus one JS bundle — is the only mode that matches the
app's actual shape. It is also the only mode compatible with GitHub Pages,
which serves static files and cannot run a Node server.

A consequence worth stating plainly: the browser's back button and URL bar
do not navigate this app, because the navigation state was never in the URL
to begin with. On the home screen (standalone display mode) there is no
browser chrome, so this is invisible in the intended usage; in a browser
tab it is a real difference from native's back gesture. Putting routes in
the URL would be a behaviour change to `App.tsx`'s router and is explicitly
left out of this change.

### 3. `Alert.alert` is replaced by a `ConfirmDialog` the app draws itself

`Alert` is backed by `UIAlertController`/`AlertDialog` and has no
`react-native-web` implementation. Left as-is, the guard in front of a
destructive action would have silently disappeared on web — the delete
button would delete immediately, with no confirmation, in violation of the
spec's "Löschen … mit Bestätigung".

`src/components/ConfirmDialog.tsx` renders the question in the app's own
paint using RN's `Modal`, which `react-native-web` does implement. Three
things follow from doing it this way rather than branching on `Platform.OS`:

- The confirmation is now _identical_ on all three platforms, rather than
  two behaviours to keep in step.
- It settles a mismatch the native alert always had. The OS paints a
  destructive action red, but ADR 0009 assigns red to player A's side of the
  bat and requires destructive controls to be de-coloured instead. Both
  dialog actions are therefore `quiet` buttons.
- It becomes testable through the same public surface as every other control
  — a role and an accessible name — instead of requiring `Alert` to be
  spied on. See §5.

### 4. Full offline support via a Workbox-generated service worker

The usage context the design system was built around (spec, "Nutzungskontext";
ADR 0009 §1) is a phone standing next to a table in a sports hall — which is
frequently a place with no usable signal. The app holds no server state at
all, so there is nothing about it that requires a network once loaded.

`npm run build:web` therefore runs `expo export -p web` and then
`workbox generateSW workbox-config.js` over the finished `dist/`. It runs
_after_ the export because the bundle filename carries a content hash, so
the precache list has to be generated from real output rather than written
by hand. The whole shell is precached and navigations fall back to the
exported `index.html`.

`workbox-cli` is a devDependency only — it never enters the app bundle, and
no new runtime dependency was added for native.

The service worker is not registered on port 8081 (`expo start --web`),
where a precached shell would serve a stale bundle over the dev server and
make edits appear to have no effect. Every other origin registers normally,
so offline behaviour can be verified from a local preview of a production
build before it ships.

### 5. The two delete tests were rewritten, and why that is not a weakened test

Six existing tests drove the delete confirmation by spying on `Alert.alert`
and synthesising a button press. With `Alert` gone, that stub no longer
corresponds to anything the app does.

The rewritten tests press the dialog's real "Löschen"/"Abbrechen" buttons by
role and accessible name. Every assertion about _observable behaviour_ is
unchanged and none was removed: nothing is deleted before confirming, the
message names the match it is about, confirming removes the match from both
the list and persistence, cancelling leaves both untouched, and only the
tapped match is affected. The suite is the same size as before this change
(98 tests) and green. What changed is the seam the test reaches through, and
it moved from a mocked native module toward the app's real public surface —
which is the direction this project's testing decisions ask for (spec,
"Testing Decisions": observable behaviour, not implementation internals).

### 6. `experiments.baseUrl` pinned to `/tabletennis-counter` for GitHub Pages

The site is served from `https://<user>.github.io/tabletennis-counter/`, a
subpath rather than a domain root. `baseUrl` prepends that prefix to every
bundled resource link. The manifest's `start_url`/`scope`/`id` and the
service worker's registration scope carry the same prefix.

This value is coupled to the repository name and to nothing else in the
build — renaming the repository, or moving to a custom domain at the root,
means changing `app.json`, `public/manifest.json` and the registration path
in `public/index.html` together. That coupling is the price of subpath
hosting; it is written down here because nothing in the build will warn
about it.

### 7. iOS specifics are handled in `public/index.html`, not in app code

Expo's SPA output uses `public/index.html` as its HTML template, injecting
the bundle script and favicon link into it. Four things live there that
have no React Native equivalent:

- `viewport-fit=cover`. `react-native-safe-area-context` reads
  `env(safe-area-inset-*)` on web, and those report 0 without this
  attribute. It is what carries ADR 0008's safe-area handling over to the
  web build — combined with `apple-mobile-web-app-status-bar-style:
black-translucent`, which is what makes a home-screen app paint under the
  status bar in the first place.
- `touch-action: manipulation`. Two fast "+1" taps are a double-tap to iOS,
  which would zoom the page. Pinch-zoom is deliberately kept (no
  `user-scalable=no`), so this removes the misfire without removing zoom
  from anyone who needs it.
- `overscroll-behavior: none`. A pull-down gesture must not reload a running
  match; on native there is nothing to pull.
- Two `theme-color` values behind `prefers-color-scheme`, and a matching
  `html` background colour, so a cold start in a dark hall does not flash
  white before the bundle parses. These duplicate `color.bg` from
  `src/theme/palette.ts` as literal hex and must be kept in step by hand —
  a plain HTML file cannot import the token module.

## Consequences

- iOS/Android are unaffected. No runtime dependency was added for native, no
  screen's behaviour changed, and the suite is green at its previous size.
- The web build is now covered by CI (`build-web` job in `ci.yml`), because
  a native-only API slipping into a screen — exactly what `Alert` was — is
  invisible to lint, typecheck and the Jest suite, and only surfaces when
  the web bundle is actually built.
- **Storage on iOS depends on the app being installed.** Safari deletes
  script-writable storage (including `localStorage`) after 7 days without
  interaction with the origin. Web apps added to the home screen are exempt
  and keep their own usage counter. So a match list survives indefinitely in
  an installed PWA, but may be cleared in a plain Safari tab after a
  fortnight of not playing — which would violate user story 23. The app does
  not currently tell the user this; see follow-ups.
- iOS shows no install prompt. Reaching the exempt, installed state requires
  the user to go through Share → "Zum Home-Bildschirm" unaided. The app does
  not currently hint at this either.
- The browser back button does not navigate the app (§2).

## Verification performed

- `npm test` — 98/98 green, the same count as before this change.
- `npm run lint`, `npm run typecheck` — clean.
- `npm run build:web` — succeeds; 8 URLs precached, ~637 kB.
- The production build was served under the real `/tabletennis-counter/`
  subpath and driven end-to-end in Chrome at a 390×844 mobile viewport
  (both colour schemes): match list empty state, setup form with presets and
  names, navigation games → sets → point counter, 11 points triggering an
  automatic set win and roll-over to set 2, undo, persistence across a full
  page reload, the delete dialog's cancel and confirm paths, service worker
  reaching `active`, and a cold start with the network switched off. No
  console or page errors.

## Known follow-ups (not done here)

1. **Tell the user to install on iOS**, and say why it matters for their
   data — the 7-day eviction above makes this a correctness issue, not a
   polish one. Needs a dismissible hint shown only in iOS Safari when not in
   standalone mode.
2. **Export/import of matches**, as a way out of any browser storage loss.
   Currently a cleared `localStorage` is unrecoverable on web.
3. **Update notification.** `skipWaiting`/`clientsClaim` swap the shell
   silently on the next load; a "neue Version verfügbar" prompt would be
   friendlier, and is the conventional pairing.
4. **Routes in the URL**, if browser back/refresh-to-current-screen is
   wanted (§2). This is a change to `App.tsx`'s router and needs its own
   decision.
5. The spec still lists a web target under "Out of Scope" and should be
   amended to match reality.

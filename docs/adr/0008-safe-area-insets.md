# 0008. Device safe-area insets on all 5 screens via `react-native-safe-area-context`

- Status: Accepted
- Date: 2026-08-10
- Ticket: [#27 — All screens: respect device safe area (notch/status bar overlap)](https://github.com/ifahrentholz/tabletennis-counter/issues/27)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)

## Context

Manual QA on an iPhone 17 Pro simulator (a notched/Dynamic-Island device)
found that every screen's header row rendered underneath the notch — none
of the 5 screens (`MatchListScreen`, `SetupFormScreen`, `MatchDetailScreen`,
`SetsOverviewScreen`, `PointCounterScreen`) accounted for device safe-area
insets. Each screen's root was a plain `View` styled with a flat
`padding: 24` — fine on a non-notched device, but on a notched one that
fixed padding sits fully inside the unsafe area, so content like
`MatchListScreen`'s "Neues Match" button/title row visually collides with
the status bar/Dynamic Island.

## Decisions

### 1. `react-native-safe-area-context` (`~5.7.0`, via `npx expo install`), not a hand-rolled `Dimensions`/`Platform` heuristic

Expo's own docs recommend this package as the standard cross-platform way
to read safe-area insets; a hand-rolled heuristic (e.g. guessing a
notch/Dynamic-Island height from `Platform`/device model) would be brittle
across the actual range of iOS/Android devices and require ongoing
maintenance as new devices ship. `npx expo install` (rather than plain
`npm install`) picked the SDK-57-compatible version automatically, per this
project's Expo-Managed-Workflow convention (ADR 0001 §1).

### 2. `SafeAreaProvider` wraps the whole app once, in `App.tsx`, above the router

`App.tsx`'s `App()` now returns a single `<SafeAreaProvider>` wrapping
whichever screen the local `Route` state machine (ADR 0004 §5, ADR 0007 §1)
selects, via a `renderScreen(route, setRoute)` helper extracted for
readability. Wrapping once at the root — rather than re-wrapping inside
each of the 5 screens — means insets are computed once by the native layer
and shared through context, and a screen swap during navigation never
remounts the provider (which would otherwise risk a brief insets flash
while a fresh native `onInsetsChange` event refires).

### 3. Each screen applies insets itself via a root `SafeAreaView`, not `useSafeAreaInsets` + manual padding

Every screen's outermost element changes from `<View style={styles.container}>`
to `<SafeAreaView style={styles.container} testID="...">` (same `container`
style, unchanged otherwise) — both for a screen's normal render and, for the
3 screens that have one (`MatchDetailScreen`, `SetsOverviewScreen`,
`PointCounterScreen`), its "Lade…" loading-state render, so a screen never
flashes unsafe padding while its match is still loading. `SafeAreaView`'s
default `edges` (`top`/`right`/`bottom`/`left`, all `'additive'`) were kept
as-is rather than restricting to just `top`/`bottom`: `'additive'` mode adds
the inset on top of each screen's existing `padding: 24` rather than
replacing it, so a non-notched device's layout is pixel-identical to before
(no visual regression, per the ticket's AC4) while a notched device gets
extra top padding for the Dynamic Island/status bar and extra bottom
padding for the home indicator — and applying all 4 edges uniformly, rather
than special-casing top/bottom, keeps the same one-line change consistent
and predictable across all 5 screens.

`useSafeAreaInsets` + manual per-screen padding math was rejected as the
default approach: it would require every screen to duplicate the same
"combine the inset with my existing padding" arithmetic that `SafeAreaView`
already does internally, for no behavioral difference here. `SafeAreaView`
is used consistently as a drop-in root-element replacement.

### 4. Testing strategy: assert the wrapper is present with the right props, not real inset pixel values

Real device insets only exist on a native device or simulator — they are
not meaningfully producible under Jest/`react-test-renderer`. Rather than
skip testing this ticket's change entirely, each screen's test file gained
one test that renders the screen and asserts its root host node is the
library's native `SafeAreaView` (`root.type === 'RNCSafeAreaView'`, found
via the `testID` each screen's root now carries) with the expected
`edges` (`top`/`bottom`: `'additive'`). `App.test.tsx` gained one test
asserting the match-list screen's own root safe-area node is reachable
through `<App />`, proving the provider is actually wired above it. This
matches the ticket's own guidance: verify the seam ("is the wrapper present
and configured correctly"), not a value only a real device produces.

Making this possible in Jest required one addition to `jest.setup.js`:

```js
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
```

The real (unmocked) `SafeAreaProvider` only renders its `children` once a
native `onInsetsChange` event fires — which never happens under
`react-test-renderer`, so every screen test would hang rendering nothing
without this mock. The library's own Jest mock (shipped at
`react-native-safe-area-context/jest/mock`) replaces `SafeAreaProvider` and
the `useSafeAreaInsets`/`useSafeAreaFrame` hooks with versions that resolve
synchronously to a fixed zero-inset metrics object; it deliberately leaves
`SafeAreaView` itself untouched, since that component renders through a
native host component (`RNCSafeAreaView`) that needs no provider/context to
mount under `react-test-renderer` in the first place. (Requiring `.default`
off the mock module — rather than the module itself — was necessary because
the mock file is TypeScript/ESM authored, and `jest.mock`'s factory must
return the same interface `require('react-native-safe-area-context')`
otherwise would.)

## Consequences

- New dependency: `react-native-safe-area-context@~5.7.0` (`package.json`,
  `package-lock.json`).
- `App.tsx`: wraps in `SafeAreaProvider`; routing logic extracted into a
  `renderScreen` helper function (behavior unchanged, purely a readability
  side effect of introducing the wrapper).
- All 5 screens (`MatchListScreen.tsx`, `SetupFormScreen.tsx`,
  `MatchDetailScreen.tsx`, `SetsOverviewScreen.tsx`,
  `PointCounterScreen.tsx`): root `View` → `SafeAreaView`, plus a `testID`
  each screen didn't previously need, added solely to make the wrapper
  assertable from tests (decision 4).
- `jest.setup.js`: one new `jest.mock` entry, alongside the existing
  AsyncStorage mock, needed by every screen/`App` test that now renders a
  `SafeAreaView`/`SafeAreaProvider`.
- No visual regression on a non-notched device: `SafeAreaView`'s additive
  edges only ever _add_ to the existing `padding: 24`, and add nothing when
  an inset is zero.

## Manual verification (not yet performed in this environment)

This environment has no iOS/Android simulator or screenshot access, so the
insets themselves were verified by reasoning about the API (decision 3),
not visually. Before/instead of merging, verify on:

- **A notched/Dynamic-Island device** (e.g. iPhone 17 Pro simulator, the
  device the original bug report used): confirm each of the 5 screens'
  header row (title/back button/"Neues Match" button) now sits fully below
  the Dynamic Island/status bar, and — where a screen's content can reach
  the bottom edge (e.g. `PointCounterScreen`'s `+1`/`-1` buttons) — that it
  isn't obscured by the home indicator.
- **A non-notched device size** (e.g. iPhone SE (3rd generation) simulator,
  which has a standard status bar and a physical home button): confirm the
  layout is visually unchanged from before this ticket — no extra/missing
  padding, since `top`/`bottom` insets on such a device are 0 (or very
  small for the status bar) and `SafeAreaView`'s additive mode should add
  effectively nothing beyond the existing `padding: 24`.

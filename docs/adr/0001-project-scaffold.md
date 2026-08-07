# 0001. Project scaffold: Expo, Jest/RNTL test harness, and CI Node version

- Status: Accepted
- Date: 2026-08-07
- Ticket: [#1 — scaffolding](https://github.com/ifahrentholz/tabletennis-counter/issues/1)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)

## Context

This is a greenfield repository. Ticket #1 is scaffolding-only: it needs to
produce a running app skeleton, a toolchain, a test harness, and CI, with no
product/domain logic yet (the domain model and scoring engine land in
ticket #2). Because there is no prior code or precedent in this repo, every
choice below establishes a convention that follow-up tickets build on.

## Decisions

### 1. Platform/stack: Expo (Managed Workflow), iOS + Android only, no web

The spec's Implementation Decisions call for React Native via Expo Managed
Workflow, targeting iOS and Android, with no web target. We scaffolded the
app with `expo` (Managed Workflow), and deliberately did **not** add the
`react-native-web`/`expo` web dependencies or a `web` npm script — `npm run
ios` / `npm run android` are the only platform launch scripts. This keeps
the dependency surface and CI matrix minimal and matches the product's
actual target devices.

### 2. Test tooling: Jest (`jest-expo`) + `@testing-library/react-native`

There is no existing test precedent in this repo, so this ticket establishes
the first test structure. Per the spec's Testing Decisions, the
scoring/domain logic (introduced in ticket #2) is the highest-value seam —
a pure, UI-independent module — so the harness needs to support both:

- pure-logic unit tests (plain Jest, no rendering), and
- component tests against React Native views.

We chose:

- **Jest with the `jest-expo` preset** as the test runner — it configures
  the React Native/Expo transform and mocks out of the box, so pure-logic
  unit tests and component tests share one runner and one config
  (`jest.config.js`).
- **`@testing-library/react-native` (RNTL)** for component tests — it
  encourages asserting on rendered, user-visible output rather than
  component internals, consistent with the spec's instruction that tests
  should check observable behavior, not implementation details.

`src/appInfo.ts` / `src/appInfo.test.ts` and
`src/PlaceholderScreen.tsx` / `src/PlaceholderScreen.test.tsx` exist purely
as worked examples of each seam (pure-logic unit test, RNTL component test)
for ticket #2 onward to follow — they carry no product behavior.

### 3. CI: GitHub Actions, format + lint + typecheck + test

`.github/workflows/ci.yml` runs on every push to `main` and on every pull
request, executing in order: `format:check` (Prettier), `lint` (ESLint),
`typecheck` (`tsc --noEmit`), then `test` (Jest, `--ci`). Running cheap
static checks before tests gives faster feedback on the most common
failures (formatting/lint) before paying for the slower test run.

### 4. Node version: pinned to 22.13.0 (main technical gotcha)

The project was initially scaffolded and verified against a locally
installed Node version. Once `@testing-library/react-native@14.0.1` was
added as a devDependency, CI started failing `npm ci` with lockfile /
optional-dependency resolution errors for `@emnapi/core` and
`@emnapi/runtime` (transitive optional deps pulled in by RNTL's toolchain).

Root cause: `@testing-library/react-native@14.0.1` requires
`node ^22.13.0 || >=24`, which is newer than the Node version the lockfile
had originally been generated under. `npm ci` enforces an exact match
between `package-lock.json` and `node_modules`, including
platform/version-conditional optional dependencies — so a lockfile
generated under an older/mismatched Node version does not reproduce
correctly in CI even though `npm install` locally papers over it.

Fix, applied consistently in three places so local dev, `.nvmrc`-aware
tooling, and CI all agree:

- `.github/workflows/ci.yml` — `actions/setup-node@v4` pinned to
  `node-version: 22.13.0`.
- `package.json` — `"engines": { "node": "^22.13.0 || >=24" }`, matching
  RNTL's own requirement so `npm install`/`npm ci` warn early on an
  incompatible Node version.
- `.nvmrc` — `22.13.0`, so `nvm use` picks the same version contributors
  and CI use.

`package-lock.json` was then regenerated (`npm install`) under Node
22.13.0 so the committed lockfile's optional-dependency resolution matches
what CI's `npm ci` expects.

**Takeaway for future contributors:** if `npm ci` fails in CI with
lockfile/optional-dependency mismatches after bumping a dependency, check
whether the new dependency raised its minimum Node version — the fix is to
bump `.nvmrc` + `engines` + the CI workflow's `node-version` together, then
regenerate `package-lock.json` under that exact Node version (not just
`npm install` locally under an old version).

### 5. Scope boundary

This ticket delivers scaffolding only: the Expo app skeleton, tooling
(TypeScript/ESLint/Prettier), the Jest/RNTL test harness described above,
CI, and the README. It intentionally contains **no** product/domain logic —
no `Match`/`Game`/`Set` model, no scoring rules, no persistence. That work
starts in ticket #2 (domain model & scoring engine), which is expected to
be the first consumer of the pure-logic unit test seam described in
decision 2.

## Consequences

- Contributors must use Node `^22.13.0 || >=24` locally (`.nvmrc` /
  `engines` enforce/document this); older Node versions will fail
  `npm ci` or emit an engines warning.
- Adding a web target later (if ever required) would need its own ADR, plus
  adding back `react-native-web`, a `web` script, and a web job/step in CI.
- Any future dependency bump that raises a minimum Node version must repeat
  the three-file pin (`.nvmrc`, `package.json#engines`,
  `.github/workflows/ci.yml`) and regenerate `package-lock.json` under that
  Node version, per the takeaway in decision 4.

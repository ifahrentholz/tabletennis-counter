# 0003. Persistence layer: AsyncStorage-backed match store, wrapping `Match` via `StoredMatch`

- Status: Accepted
- Date: 2026-08-07
- Ticket: [#3 — persistence](https://github.com/ifahrentholz/tabletennis-counter/issues/3)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) §6 (the interface
  boundary this ticket implements)

## Context

Ticket #2 delivered a pure, UI-independent scoring engine
(`src/domain/match.ts`) that exports `Match` with no identity or timestamp
fields, by design (ADR 0002 §6). This ticket adds on-device persistence for
the full match hierarchy (Match/Games/Sets), with no backend, account, or
cloud-sync, and no explicit "save" action anywhere in the app — every state
change autosaves immediately. The persistence layer must be verified through
its public interface (list/get/save/delete), not storage internals, per the
spec's Testing Decisions.

## Decisions

### 1. Wrap, don't extend: `StoredMatch { id, updatedAt, match }`

`src/persistence/matchStore.ts` exports `StoredMatch`, a wrapper around the
pure `Match` value:

```ts
interface StoredMatch {
  id: string;
  updatedAt: number;
  match: Match;
}
```

`src/domain/match.ts` is not modified. This directly implements the decision
recorded in ADR 0002 §6: identity and modification time are persistence
concerns, not scoring concerns, so they live in a wrapper type that the
persistence module owns. `updatedAt` is a `number` (epoch milliseconds, from
`Date.now()`) rather than a string, since it is compared/sorted numerically
(list ordering) and never parsed/formatted by this module.

### 2. Storage engine: `@react-native-async-storage/async-storage`

The full match hierarchy (`Match`, its `games`, their `sets`) is a single
plain, JSON-serializable value (ADR 0002 §1) with no relational querying
requirements — the only operations needed are list-all, get/save/delete a
single match by id, sorted by `updatedAt`. A key-value store is sufficient
and considerably simpler than introducing a SQL schema and migrations
(`expo-sqlite`) for a shape that has no joins, foreign keys, or partial-field
queries. Each match is stored as one JSON blob under
`` `@tabletennis-counter/match/${id}` ``; `listMatches` uses
`AsyncStorage.getAllKeys()` + `multiGet` to gather all of them rather than
maintaining a separate hand-rolled index key, avoiding a second piece of
state that could drift out of sync with the individual match records.

`@react-native-async-storage/async-storage` was added via `npx expo install`
so its version is pinned to the one compatible with this project's Expo SDK
(57), consistent with how the rest of the native dependency surface is
managed.

### 3. Autosave is a caller responsibility; this module has no in-memory cache

`saveMatch` persists synchronously with respect to the caller (it awaits the
write before resolving) and every call — from creating a match through to
every subsequent point/set/game/override — goes through it. There is no
in-memory cache or debounce inside this module: every `getMatch`/`listMatches`
call reads straight from `AsyncStorage`, so there is no hidden state that
could diverge from what was actually persisted, and no risk of returning
stale data after an external change. This module is the autosave mechanism;
it exposes no "save" button/action of its own, matching the spec's
requirement that state changes are persisted immediately with no explicit
save step anywhere in the app. Callers (UI state, tickets #4–#7) are expected
to call `saveMatch` after every domain mutation, not on a timer or on
navigation.

### 4. `saveMatch` is a single upsert operation, not separate create/update calls

`saveMatch(match: Match, id?: string): Promise<StoredMatch>` creates a new
match (fresh generated id) when `id` is omitted, or persists a state change
to an existing match when `id` is supplied — both paths stamp `updatedAt` to
the current time and return the resulting `StoredMatch`. This matches the
ticket's framing of "get/save/delete-single-match operations" as one save
operation rather than two, and returning the `StoredMatch` means a caller
creating a new match gets its generated `id` back immediately for subsequent
updates.

Ids are generated locally (`` `${Date.now().toString(36)}-${random}` ``)
rather than via a UUID library or platform crypto API, since they only need
to be unique among this device's own locally stored matches — there is no
cross-device sync or security requirement that would call for
cryptographically strong randomness.

### 5. `listMatches` sorts by `updatedAt` descending

`listMatches` returns matches already sorted newest-first, rather than
leaving sorting to callers. The spec's match-list story (newest-changed
first) is the only consumer of list ordering described so far, so doing it
once in the persistence layer avoids every future screen needing to
re-implement the same sort.

## Consequences

- The persistence layer is fully testable against the public interface using
  the community-maintained in-memory `AsyncStorage` Jest mock
  (`@react-native-async-storage/async-storage/jest/async-storage-mock`,
  wired up in `jest.setup.js`) — no native module, no real device storage,
  and no reaching into storage internals from tests
  (`src/persistence/matchStore.test.ts`).
- `src/domain/match.ts`'s public shape remains unchanged and stable for
  tickets #4–#7, as ADR 0002 §6 required.
- Tickets #4–#7 (UI) build directly against `listMatches`/`getMatch`/
  `saveMatch`/`deleteMatch` and call `saveMatch` after every domain mutation
  to satisfy the spec's autosave requirement; there is no separate
  autosave/debounce layer to wire up.
- If a future ticket needs richer querying (e.g. filtering, pagination) that
  a key-value store cannot serve well, that would call for a follow-up ADR
  re-evaluating the `expo-sqlite` alternative rather than a silent swap.

# 0011. Hierarchy naming corrected to Match → Satz → Spiel → Punkt

- Status: Accepted
- Date: 2026-09-13
- Ticket: [#33 — Hierarchie-Benennung Match/Satz/Spiel korrigieren](https://github.com/ifahrentholz/tabletennis-counter/issues/33)
- Spec: [docs/specs/tabletennis-counter.md](../specs/tabletennis-counter.md)
- Related: [ADR 0002](0002-scoring-domain-engine.md) (the model being renamed),
  [ADR 0004](0004-match-setup-form.md) §5 (the `Route` state machine),
  [ADR 0006](0006-games-sets-overview-edit-mode.md) (screens 3/4, whose roles
  swap names here)

## Context

The app counts on four levels: a match, two aggregating levels below it, and
the live point count at the bottom. The two middle levels were named the
wrong way round everywhere — in the spec, in the domain model, and on screen.
A `Match` held `Game`s ("Spiele"), each `Game` held `Set`s ("Sätze"), so the
app told the player that a Spiel contains Sätze. It is the other way round: a
Satz contains Spiele.

The inversion was consistent, which is why nothing ever broke: every layer
was wrong in the same direction, so the arithmetic was right and only the
words were false. That is also why it could not be fixed in one place — the
words are in the type names, the field names, the config keys, the route
names, the screen names and the German labels alike.

## Decisions

### 1. Invert the two middle levels everywhere, in one pass

The corrected hierarchy is **Match → Sätze → Spiele → Punkte**. Applied
throughout:

| before                           | after                            |
| -------------------------------- | -------------------------------- |
| `Match.games` / `Match.gamesWon` | `Match.sets` / `Match.setsWon`   |
| `GameState { sets, setsWon }`    | `SetState { games, gamesWon }`   |
| `SetState { points, pointLog }`  | `GameState { points, pointLog }` |
| `MatchConfig.setsToWinGame`      | `MatchConfig.gamesToWinSet`      |
| `MatchConfig.gamesToWinMatch`    | `MatchConfig.setsToWinMatch`     |
| `adjustGameSetsWon`              | `adjustSetGamesWon`              |
| `adjustMatchGamesWon`            | `adjustMatchSetsWon`             |
| `SetsOverviewScreen` (screen 4)  | `GamesOverviewScreen` (screen 4) |
| `MatchDetailScreen` = games list | `MatchDetailScreen` = sets list  |
| route `gamesOverview` (screen 3) | route `setsOverview` (screen 3)  |
| route `setsOverview` (screen 4)  | route `gamesOverview` (screen 4) |

Renaming the internal identifiers alongside the labels is the point, not
scope creep: a `SetsOverviewScreen` that lists Spiele, or a `setsToWinGame`
read as "Spiele pro Satz", reproduces exactly the confusion this ticket
removes, and the next reader has no way to tell which of the two spellings
is the truth.

Nothing about the scoring behaviour changed. The engine's structure, the
deuce rule, the freeze-on-completion contract, the preset values (3/5/6/7
and 1/3/5) and their defaults (6 and 3) all stay attached to the hierarchy
position they always had; only their names moved.

### 2. Migrate pre-#33 records on read, detecting them by shape

`matchStore` persists the domain value verbatim, so renaming a domain field
renames a storage field: a match saved by an earlier build carries
`games`/`gamesWon`/`setsToWinGame`, and the renamed screens read
`sets`/`setsWon`. Left alone, the match list — the app's entry point —
would throw on the first row, for every stored match at once. The rename is
not a rename if it silently discards the data it renames.

Reads therefore pass through `parseStored`, which upgrades a legacy record
to the current names. Three choices inside that:

- **Detection by shape, not by a version field.** A version field would only
  ever appear on records written from now on; the records that actually need
  identifying are already on devices without one. The presence of `games` —
  a key only the old shape has ever had — is the marker.
- **A pure field rename, no recomputation.** #33 swapped what the two middle
  levels are called, not which level sits where, so the nesting, every
  aggregated count and every point log carry over untouched. No winner is
  re-derived, so a migrated match cannot change its own result.
- **On read only, no write-back.** The next `saveMatch` — which every screen
  issues after every change — persists the current shape by itself. Writing
  during `listMatches` would have to bump `updatedAt` and would silently
  reorder the list the player is looking at.

### 3. Earlier ADRs are left as written

ADRs 0001–0010 keep the old vocabulary, as does
[docs/specs/design-pass-visual-overhaul.md](../specs/design-pass-visual-overhaul.md),
whose acceptance criteria were signed off under ticket #29. They are dated,
accepted records of decisions taken at a point in time, and rewriting their
prose would make them claim a naming that did not exist when they were
decided. This ADR is the pointer: where an older record says "game" for the
level below the match, read "set", and vice versa. The two living documents —
`docs/specs/tabletennis-counter.md` and the README — were corrected in place
instead, because they describe the app as it is now.

## Consequences

- The German UI reads correctly for the first time: the setup form asks for
  "Punkte pro Spiel", "Spiele pro Satz" and "Sätze pro Match"; screen 3 is
  the Satzübersicht with a Satzverlauf; screen 4 is the Spielübersicht of one
  Satz; the counter's position line reads "Spiel n · Satz m".
- Matches persisted by an earlier build keep working: they load under the
  corrected names, list, open, and can be played on and edited. The upgrade
  is invisible — there is no prompt, no data loss and no reordering of the
  match list.
- The one behavioural addition is that read path. Everything else in this
  ticket is names: no scoring rule, preset, default, layout or user flow
  moved.
- The full suite is green at 110 tests in 10 files — the same assertions as
  before, plus one pinning the point counter's position line (previously the
  only user-visible hierarchy label with no test at all), four covering the
  two overview screens' headings and formats, six feeding the store real
  pre-#33 JSON, and one rendering the match list from it.

## Known follow-ups (not done here)

1. **The legacy read path has no expiry.** `parseStored` will keep
   recognising the old shape forever, which is cheap but is dead weight once
   no device can plausibly still hold a pre-#33 record. Removing it later is
   safe only if a deliberate decision is taken that any such record may be
   dropped; that decision is not this ticket's to make.
2. **`MatchDetailScreen`'s file name** still says nothing about which level
   it shows. It is level-neutral and therefore survived the rename untouched,
   but `SetsOverviewScreen` would now be its accurate name — which is exactly
   the name screen 4 used to carry. Renaming it in the same pass would have
   made the diff unreadable.

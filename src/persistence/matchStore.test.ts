import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPoint, createMatch, undoPoint } from '../domain/match';
import type { MatchConfig } from '../domain/match';
import { deleteMatch, getMatch, listMatches, saveMatch } from './matchStore';

function makeConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    pointsToWin: 11,
    gamesToWinSet: 6,
    setsToWinMatch: 3,
    playerAName: 'Alice',
    playerBName: 'Bob',
    ...overrides,
  };
}

/**
 * Writes a match in the pre-#33 persisted shape straight into storage,
 * bypassing `saveMatch` — which can only ever write the current shape.
 *
 * Reaching for the raw storage key is deliberate here: the thing under test
 * is exactly the bytes an older build left on a real device, so the test has
 * to put those bytes there itself. Back then the level below the match was
 * called a "game" holding "sets": `match.games[].sets[]`, `gamesWon`/
 * `setsWon`, `setsToWinGame`/`gamesToWinMatch`.
 */
async function seedLegacyMatch(
  id: string,
  legacyMatch: unknown,
  updatedAt = 1_000,
): Promise<string> {
  await AsyncStorage.setItem(
    `@tabletennis-counter/match/${id}`,
    JSON.stringify({ id, updatedAt, match: legacyMatch }),
  );
  return id;
}

/**
 * A pre-#33 match mid-play: one "game" (today: set) in progress, its first
 * "set" (today: game) won 11:0 by A, a second one running at 3:2.
 */
function legacyMatch() {
  return {
    config: {
      pointsToWin: 11,
      setsToWinGame: 6,
      gamesToWinMatch: 3,
      playerAName: 'Alice',
      playerBName: 'Bob',
    },
    games: [
      {
        sets: [
          {
            points: { A: 11, B: 0 },
            pointLog: Array.from({ length: 11 }, () => 'A'),
            winner: 'A',
          },
          { points: { A: 3, B: 2 }, pointLog: ['A', 'B', 'A', 'B', 'A'], winner: null },
        ],
        setsWon: { A: 1, B: 0 },
        winner: null,
      },
    ],
    gamesWon: { A: 0, B: 0 },
    winner: null,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('saveMatch', () => {
  it('persists a newly created match immediately, with no explicit save step', async () => {
    const match = createMatch(makeConfig());

    const stored = await saveMatch(match);

    const reloaded = await getMatch(stored.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.match).toEqual(match);
  });
});

describe('getMatch', () => {
  it('returns null when no match is stored under the given id', async () => {
    const result = await getMatch('does-not-exist');

    expect(result).toBeNull();
  });
});

describe('autosave of state changes', () => {
  it('persists any change to a match (e.g. a point) immediately, retrievable after reload', async () => {
    const match = createMatch(makeConfig());
    const stored = await saveMatch(match);

    const afterPoint = addPoint(stored.match, 'A');
    await saveMatch(afterPoint, stored.id);

    const reloaded = await getMatch(stored.id);
    expect(reloaded?.match).toEqual(afterPoint);
  });

  it('bumps updatedAt to a later time on each subsequent save', async () => {
    const match = createMatch(makeConfig());
    const stored = await saveMatch(match);

    const later = stored.updatedAt + 1000;
    jest.spyOn(Date, 'now').mockReturnValue(later);
    const updated = await saveMatch(addPoint(stored.match, 'A'), stored.id);
    jest.spyOn(Date, 'now').mockRestore();

    expect(updated.updatedAt).toBe(later);
    expect(updated.updatedAt).toBeGreaterThan(stored.updatedAt);
  });

  it("round-trips a game's pointLog exactly, so undo remains correct after reload", async () => {
    const match = createMatch(makeConfig());
    const scored = addPoint(addPoint(addPoint(match, 'A'), 'A'), 'B'); // A:2 B:1
    const stored = await saveMatch(scored);

    const reloaded = await getMatch(stored.id);
    expect(reloaded).not.toBeNull();
    const reloadedMatch = reloaded!.match;
    expect(reloadedMatch.sets[0].games[0].pointLog).toEqual(['A', 'A', 'B']);

    // Undo correctness after reload depends on the pointLog surviving intact.
    const undone = undoPoint(reloadedMatch);
    expect(undone.sets[0].games[0].points).toEqual({ A: 2, B: 0 });
  });
});

describe('listMatches', () => {
  it('returns an empty list when no matches have been saved', async () => {
    const result = await listMatches();

    expect(result).toEqual([]);
  });

  it('lists all saved matches, sorted by updatedAt descending (newest first)', async () => {
    const configA = makeConfig({ playerAName: 'Oldest' });
    const configB = makeConfig({ playerAName: 'Middle' });
    const configC = makeConfig({ playerAName: 'Newest' });

    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const oldest = await saveMatch(createMatch(configA));
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    const middle = await saveMatch(createMatch(configB));
    jest.spyOn(Date, 'now').mockReturnValue(3000);
    const newest = await saveMatch(createMatch(configC));
    jest.spyOn(Date, 'now').mockRestore();

    const all = await listMatches();

    expect(all.map((stored) => stored.id)).toEqual([newest.id, middle.id, oldest.id]);
  });

  it('reflects a saved change in updatedAt-based ordering on the next list call', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    const first = await saveMatch(createMatch(makeConfig({ playerAName: 'First' })));
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    const second = await saveMatch(createMatch(makeConfig({ playerAName: 'Second' })));

    jest.spyOn(Date, 'now').mockReturnValue(3000);
    await saveMatch(addPoint(first.match, 'A'), first.id);
    jest.spyOn(Date, 'now').mockRestore();

    const all = await listMatches();

    expect(all.map((stored) => stored.id)).toEqual([first.id, second.id]);
  });
});

describe('legacy matches persisted before the #33 hierarchy rename', () => {
  it('loads a pre-#33 match under the corrected field names instead of failing on them', async () => {
    const id = await seedLegacyMatch('legacy-1', legacyMatch());

    const reloaded = await getMatch(id);

    expect(reloaded).not.toBeNull();
    const { match } = reloaded!;
    expect(match.config).toEqual({
      pointsToWin: 11,
      gamesToWinSet: 6,
      setsToWinMatch: 3,
      playerAName: 'Alice',
      playerBName: 'Bob',
    });
    expect(match.setsWon).toEqual({ A: 0, B: 0 });
    expect(match.sets).toHaveLength(1);
    expect(match.sets[0].gamesWon).toEqual({ A: 1, B: 0 });
    expect(match.sets[0].winner).toBeNull();
    expect(match.sets[0].games).toHaveLength(2);
    expect(match.sets[0].games[0]).toEqual({
      points: { A: 11, B: 0 },
      pointLog: Array.from({ length: 11 }, () => 'A'),
      winner: 'A',
    });
    expect(match.sets[0].games[1].points).toEqual({ A: 3, B: 2 });
  });

  it('leaves no legacy field behind on the loaded match', async () => {
    const id = await seedLegacyMatch('legacy-2', legacyMatch());

    const reloaded = await getMatch(id);
    const match = reloaded!.match as unknown as Record<string, unknown>;

    expect(match.games).toBeUndefined();
    expect(match.gamesWon).toBeUndefined();
    expect(match.config).not.toHaveProperty('setsToWinGame');
    expect(match.config).not.toHaveProperty('gamesToWinMatch');
  });

  it('lists a pre-#33 match alongside current-shape ones, both already migrated', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(5000);
    const current = await saveMatch(createMatch(makeConfig({ playerAName: 'Carol' })));
    jest.spyOn(Date, 'now').mockRestore();
    await seedLegacyMatch('legacy-3', legacyMatch(), 4000);

    const all = await listMatches();

    expect(all.map((stored) => stored.id)).toEqual([current.id, 'legacy-3']);
    expect(all[1].match.setsWon).toEqual({ A: 0, B: 0 });
    expect(all[1].match.sets[0].gamesWon).toEqual({ A: 1, B: 0 });
  });

  it('keeps a migrated match fully playable: a point lands in its running game', async () => {
    const id = await seedLegacyMatch('legacy-4', legacyMatch());
    const reloaded = await getMatch(id);

    const scored = addPoint(reloaded!.match, 'B'); // running game was 3:2
    await saveMatch(scored, id);

    const afterSave = await getMatch(id);
    expect(afterSave!.match.sets[0].games[1].points).toEqual({ A: 3, B: 3 });
    // The undo history survived the migration, so undo still reverses the
    // real last point rather than guessing.
    expect(undoPoint(afterSave!.match).sets[0].games[1].points).toEqual({ A: 3, B: 2 });
  });

  it('rewrites the record in the current shape on the next save', async () => {
    const id = await seedLegacyMatch('legacy-5', legacyMatch());
    const reloaded = await getMatch(id);

    await saveMatch(reloaded!.match, id);

    const raw = await AsyncStorage.getItem(`@tabletennis-counter/match/${id}`);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('"setsToWinGame"');
    expect(raw).toContain('"gamesToWinSet"');
  });

  it('migrates a pre-#33 match that was already won, keeping it complete', async () => {
    const won = { ...legacyMatch(), gamesWon: { A: 3, B: 0 }, winner: 'A' };
    const id = await seedLegacyMatch('legacy-6', won);

    const reloaded = await getMatch(id);

    expect(reloaded!.match.setsWon).toEqual({ A: 3, B: 0 });
    expect(reloaded!.match.winner).toBe('A');
  });
});

describe('deleteMatch', () => {
  it('removes a saved match so it no longer appears in list/get results', async () => {
    const kept = await saveMatch(createMatch(makeConfig({ playerAName: 'Kept' })));
    const removed = await saveMatch(createMatch(makeConfig({ playerAName: 'Removed' })));

    await deleteMatch(removed.id);

    expect(await getMatch(removed.id)).toBeNull();
    const all = await listMatches();
    expect(all.map((stored) => stored.id)).toEqual([kept.id]);
  });

  it('is a no-op when deleting an id that was never saved', async () => {
    await expect(deleteMatch('never-saved')).resolves.toBeUndefined();
  });
});

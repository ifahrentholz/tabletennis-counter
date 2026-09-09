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

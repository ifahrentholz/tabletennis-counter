import {
  addPoint,
  adjustGameSetsWon,
  adjustMatchGamesWon,
  createMatch,
  isMatchComplete,
  undoPoint,
} from './match';
import type { Match, MatchConfig, Player } from './match';

function makeConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    pointsToWin: 11,
    setsToWinGame: 6,
    gamesToWinMatch: 3,
    playerAName: 'Alice',
    playerBName: 'Bob',
    ...overrides,
  };
}

function currentGameOf(match: Match) {
  return match.games[match.games.length - 1];
}

function currentSetOf(match: Match) {
  const game = currentGameOf(match);
  return game.sets[game.sets.length - 1];
}

/** Awards `count` points to `player`, returning the resulting match. */
function scorePoints(match: Match, player: Player, count: number): Match {
  let result = match;
  for (let i = 0; i < count; i += 1) {
    result = addPoint(result, player);
  }
  return result;
}

describe('createMatch', () => {
  it('starts with zero points, zero sets and zero games for both players', () => {
    const match = createMatch(makeConfig());

    expect(match.config).toEqual(makeConfig());
    expect(match.winner).toBeNull();
    expect(match.gamesWon).toEqual({ A: 0, B: 0 });
    expect(match.games).toHaveLength(1);

    const currentGame = match.games[0];
    expect(currentGame.winner).toBeNull();
    expect(currentGame.setsWon).toEqual({ A: 0, B: 0 });
    expect(currentGame.sets).toHaveLength(1);

    const currentSet = currentGame.sets[0];
    expect(currentSet.winner).toBeNull();
    expect(currentSet.points).toEqual({ A: 0, B: 0 });
  });
});

describe('addPoint', () => {
  it("increases the scoring player's point count in the running set", () => {
    const match = createMatch(makeConfig());

    const afterA = addPoint(match, 'A');
    expect(currentSetOf(afterA).points).toEqual({ A: 1, B: 0 });

    const afterB = addPoint(afterA, 'B');
    expect(currentSetOf(afterB).points).toEqual({ A: 1, B: 1 });
  });

  it('does not mutate the match passed in', () => {
    const match = createMatch(makeConfig());

    addPoint(match, 'A');

    expect(currentSetOf(match).points).toEqual({ A: 0, B: 0 });
  });
});

describe('undoPoint', () => {
  it('removes exactly the last point awarded, for the correct player', () => {
    const match = createMatch(makeConfig());

    const scored = scorePoints(scorePoints(match, 'A', 2), 'B', 1); // A:2 B:1, last point was B's
    const undone = undoPoint(scored);

    expect(currentSetOf(undone).points).toEqual({ A: 2, B: 0 });
  });

  it('is a no-op when the running set has no points to undo yet', () => {
    const match = createMatch(makeConfig());

    const undone = undoPoint(match);

    expect(currentSetOf(undone).points).toEqual({ A: 0, B: 0 });
  });

  it('cannot reach back into an already-completed set to edit its points', () => {
    const config = makeConfig({ pointsToWin: 11 });
    const match = createMatch(config);

    const setWon = scorePoints(match, 'A', 11); // A wins set 1 at 11:0, new set starts
    expect(setWon.games[0].sets[0].winner).toBe('A');
    expect(setWon.games[0].sets).toHaveLength(2); // new running set started

    const undone = undoPoint(setWon);

    // The completed set's points are untouched; there was nothing to undo
    // in the new (empty) running set.
    expect(undone.games[0].sets[0].points).toEqual({ A: 11, B: 0 });
    expect(undone.games[0].sets[0].winner).toBe('A');
    expect(currentSetOf(undone).points).toEqual({ A: 0, B: 0 });
  });
});

describe('set win rule (deuce)', () => {
  it('wins the set once a player reaches the point limit with a 2-point lead', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const almost = scorePoints(match, 'A', 10);
    expect(currentSetOf(almost).winner).toBeNull();

    const won = addPoint(almost, 'A'); // 11:0
    expect(currentSetOf(won).winner).toBeNull(); // set already advanced, but let's check the completed one
    expect(won.games[0].sets[0].winner).toBe('A');
  });

  it('keeps the set running past the point limit without a 2-point lead (deuce)', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const deuce = scorePoints(scorePoints(match, 'A', 10), 'B', 10); // 10:10
    const oneAhead = addPoint(deuce, 'A'); // 11:10

    expect(currentSetOf(oneAhead).winner).toBeNull();
    expect(currentSetOf(oneAhead).points).toEqual({ A: 11, B: 10 });

    const twoAhead = addPoint(oneAhead, 'A'); // 12:10
    expect(twoAhead.games[0].sets[0].winner).toBe('A');
    expect(twoAhead.games[0].sets[0].points).toEqual({ A: 12, B: 10 });
  });

  it('supports the 21-point variant identically', () => {
    const match = createMatch(makeConfig({ pointsToWin: 21 }));

    const almost = scorePoints(match, 'B', 20);
    expect(currentSetOf(almost).winner).toBeNull();

    const won = addPoint(almost, 'B');
    expect(won.games[0].sets[0].winner).toBe('B');
  });

  it('starts a fresh running set immediately after a set is won', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const setWon = scorePoints(match, 'A', 11);

    expect(setWon.games[0].sets).toHaveLength(2);
    expect(currentSetOf(setWon).points).toEqual({ A: 0, B: 0 });
    expect(currentSetOf(setWon).winner).toBeNull();
  });
});

describe('game win rule', () => {
  function winASet(match: Match, winner: Player): Match {
    const loser: Player = winner === 'A' ? 'B' : 'A';
    return scorePoints(scorePoints(match, loser, 5), winner, 11);
  }

  it('wins the game once a player reaches the configured sets-to-win-game threshold', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11, setsToWinGame: 3 }));

    let current = match;
    for (let i = 0; i < 2; i += 1) {
      current = winASet(current, 'A');
    }
    expect(currentGameOf(current).setsWon).toEqual({ A: 2, B: 0 });
    expect(currentGameOf(current).winner).toBeNull();
    expect(current.games).toHaveLength(1);

    current = winASet(current, 'A'); // 3rd set win -> game won

    expect(current.games[0].winner).toBe('A');
    expect(current.games[0].setsWon).toEqual({ A: 3, B: 0 });
    expect(current.games).toHaveLength(2); // next game auto-started
    expect(currentGameOf(current).winner).toBeNull();
    expect(currentGameOf(current).sets).toHaveLength(1);
  });
});

describe('match win rule', () => {
  function winAGame(match: Match, winner: Player, setsToWinGame: number): Match {
    const loser: Player = winner === 'A' ? 'B' : 'A';
    let current = match;
    for (let i = 0; i < setsToWinGame; i += 1) {
      current = scorePoints(scorePoints(current, loser, 5), winner, 11);
    }
    return current;
  }

  it('wins the match once a player reaches the configured games-to-win-match threshold', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 3 });
    const match = createMatch(config);

    let current = winAGame(match, 'A', 3);
    current = winAGame(current, 'A', 3);
    expect(current.gamesWon).toEqual({ A: 2, B: 0 });
    expect(current.winner).toBeNull();
    expect(isMatchComplete(current)).toBe(false);

    const matchWon = winAGame(current, 'A', 3);

    expect(matchWon.gamesWon).toEqual({ A: 3, B: 0 });
    expect(matchWon.winner).toBe('A');
    expect(isMatchComplete(matchWon)).toBe(true);
  });
});

describe('manual overrides', () => {
  it("overrides a game's aggregated set count without recalculating the game winner", () => {
    const match = createMatch(makeConfig({ setsToWinGame: 3 }));

    const bumped = adjustGameSetsWon(match, 0, 'A', 1);
    expect(bumped.games[0].setsWon).toEqual({ A: 1, B: 0 });
    expect(bumped.games[0].winner).toBeNull();

    // Push past the threshold via manual overrides only; no auto-win/new game.
    const atThreshold = adjustGameSetsWon(adjustGameSetsWon(bumped, 0, 'A', 1), 0, 'A', 1);
    expect(atThreshold.games[0].setsWon).toEqual({ A: 3, B: 0 });
    expect(atThreshold.games[0].winner).toBeNull();
    expect(atThreshold.games).toHaveLength(1);
  });

  it('decrements and clamps a game set count at zero', () => {
    const match = createMatch(makeConfig());

    const decremented = adjustGameSetsWon(match, 0, 'A', -1);

    expect(decremented.games[0].setsWon).toEqual({ A: 0, B: 0 });
  });

  it("overrides the match's aggregated game count without recalculating the match winner", () => {
    const match = createMatch(makeConfig({ gamesToWinMatch: 3 }));

    const atThreshold = adjustMatchGamesWon(
      adjustMatchGamesWon(adjustMatchGamesWon(match, 'B', 1), 'B', 1),
      'B',
      1,
    );

    expect(atThreshold.gamesWon).toEqual({ A: 0, B: 3 });
    expect(atThreshold.winner).toBeNull();
    expect(isMatchComplete(atThreshold)).toBe(false);
  });

  it('decrements and clamps the match game count at zero', () => {
    const match = createMatch(makeConfig());

    const decremented = adjustMatchGamesWon(match, 'B', -1);

    expect(decremented.gamesWon).toEqual({ A: 0, B: 0 });
  });

  it('can override an earlier, already-finished game within a still-open match', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 3 });
    const match = createMatch(config);

    let current = match;
    for (let i = 0; i < 3; i += 1) {
      current = scorePoints(scorePoints(current, 'B', 5), 'A', 11);
    }
    expect(current.games[0].winner).toBe('A');
    expect(current.games).toHaveLength(2);

    const corrected = adjustGameSetsWon(current, 0, 'B', 1);

    expect(corrected.games[0].setsWon).toEqual({ A: 3, B: 1 });
    expect(corrected.games[0].winner).toBe('A'); // not recalculated
  });
});

describe('match completion locks the whole hierarchy', () => {
  function playToMatchWin(config: MatchConfig): Match {
    const match = createMatch(config);
    let current = match;
    for (let g = 0; g < config.gamesToWinMatch; g += 1) {
      for (let s = 0; s < config.setsToWinGame; s += 1) {
        current = scorePoints(scorePoints(current, 'B', 0), 'A', config.pointsToWin);
      }
    }
    return current;
  }

  it('rejects further points once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 });
    const won = playToMatchWin(config);
    expect(isMatchComplete(won)).toBe(true);

    const afterExtraPoint = addPoint(won, 'B');

    expect(afterExtraPoint).toBe(won); // unchanged reference: rejected outright
  });

  it('rejects undo once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(undoPoint(won)).toBe(won);
  });

  it('rejects a game set-count override once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(adjustGameSetsWon(won, 0, 'A', 1)).toBe(won);
  });

  it('rejects a match game-count override once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(adjustMatchGamesWon(won, 'A', 1)).toBe(won);
  });
});

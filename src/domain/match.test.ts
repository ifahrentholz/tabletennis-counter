import {
  addPoint,
  adjustMatchSetsWon,
  adjustSetGamesWon,
  createMatch,
  isMatchComplete,
  undoPoint,
} from './match';
import type { Match, MatchConfig, Player } from './match';

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

function currentSetOf(match: Match) {
  return match.sets[match.sets.length - 1];
}

function currentGameOf(match: Match) {
  const set = currentSetOf(match);
  return set.games[set.games.length - 1];
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
  it('starts with zero sets, zero games and zero points for both players', () => {
    const match = createMatch(makeConfig());

    expect(match.config).toEqual(makeConfig());
    expect(match.winner).toBeNull();
    expect(match.setsWon).toEqual({ A: 0, B: 0 });
    expect(match.sets).toHaveLength(1);

    const currentSet = match.sets[0];
    expect(currentSet.winner).toBeNull();
    expect(currentSet.gamesWon).toEqual({ A: 0, B: 0 });
    expect(currentSet.games).toHaveLength(1);

    const currentGame = currentSet.games[0];
    expect(currentGame.winner).toBeNull();
    expect(currentGame.points).toEqual({ A: 0, B: 0 });
  });
});

describe('addPoint', () => {
  it("increases the scoring player's point count in the running game", () => {
    const match = createMatch(makeConfig());

    const afterA = addPoint(match, 'A');
    expect(currentGameOf(afterA).points).toEqual({ A: 1, B: 0 });

    const afterB = addPoint(afterA, 'B');
    expect(currentGameOf(afterB).points).toEqual({ A: 1, B: 1 });
  });

  it('does not mutate the match passed in', () => {
    const match = createMatch(makeConfig());

    addPoint(match, 'A');

    expect(currentGameOf(match).points).toEqual({ A: 0, B: 0 });
  });
});

describe('undoPoint', () => {
  it('removes exactly the last point awarded, for the correct player', () => {
    const match = createMatch(makeConfig());

    const scored = scorePoints(scorePoints(match, 'A', 2), 'B', 1); // A:2 B:1, last point was B's
    const undone = undoPoint(scored);

    expect(currentGameOf(undone).points).toEqual({ A: 2, B: 0 });
  });

  it('is a no-op when the running game has no points to undo yet', () => {
    const match = createMatch(makeConfig());

    const undone = undoPoint(match);

    expect(currentGameOf(undone).points).toEqual({ A: 0, B: 0 });
  });

  it('cannot reach back into an already-completed game to edit its points', () => {
    const config = makeConfig({ pointsToWin: 11 });
    const match = createMatch(config);

    const gameWon = scorePoints(match, 'A', 11); // A wins game 1 at 11:0, new game starts
    expect(gameWon.sets[0].games[0].winner).toBe('A');
    expect(gameWon.sets[0].games).toHaveLength(2); // new running game started

    const undone = undoPoint(gameWon);

    // The completed game's points are untouched; there was nothing to undo
    // in the new (empty) running game.
    expect(undone.sets[0].games[0].points).toEqual({ A: 11, B: 0 });
    expect(undone.sets[0].games[0].winner).toBe('A');
    expect(currentGameOf(undone).points).toEqual({ A: 0, B: 0 });
  });
});

describe('game win rule (deuce)', () => {
  it('wins the game once a player reaches the point limit with a 2-point lead', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const almost = scorePoints(match, 'A', 10);
    expect(currentGameOf(almost).winner).toBeNull();

    const won = addPoint(almost, 'A'); // 11:0
    expect(currentGameOf(won).winner).toBeNull(); // game already advanced, but let's check the completed one
    expect(won.sets[0].games[0].winner).toBe('A');
  });

  it('keeps the game running past the point limit without a 2-point lead (deuce)', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const deuce = scorePoints(scorePoints(match, 'A', 10), 'B', 10); // 10:10
    const oneAhead = addPoint(deuce, 'A'); // 11:10

    expect(currentGameOf(oneAhead).winner).toBeNull();
    expect(currentGameOf(oneAhead).points).toEqual({ A: 11, B: 10 });

    const twoAhead = addPoint(oneAhead, 'A'); // 12:10
    expect(twoAhead.sets[0].games[0].winner).toBe('A');
    expect(twoAhead.sets[0].games[0].points).toEqual({ A: 12, B: 10 });
  });

  it('supports the 21-point variant identically', () => {
    const match = createMatch(makeConfig({ pointsToWin: 21 }));

    const almost = scorePoints(match, 'B', 20);
    expect(currentGameOf(almost).winner).toBeNull();

    const won = addPoint(almost, 'B');
    expect(won.sets[0].games[0].winner).toBe('B');
  });

  it('starts a fresh running game immediately after a game is won', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11 }));

    const gameWon = scorePoints(match, 'A', 11);

    expect(gameWon.sets[0].games).toHaveLength(2);
    expect(currentGameOf(gameWon).points).toEqual({ A: 0, B: 0 });
    expect(currentGameOf(gameWon).winner).toBeNull();
  });
});

describe('set win rule', () => {
  function winAGame(match: Match, winner: Player): Match {
    const loser: Player = winner === 'A' ? 'B' : 'A';
    return scorePoints(scorePoints(match, loser, 5), winner, 11);
  }

  it('wins the set once a player reaches the configured games-to-win-set threshold', () => {
    const match = createMatch(makeConfig({ pointsToWin: 11, gamesToWinSet: 3 }));

    let current = match;
    for (let i = 0; i < 2; i += 1) {
      current = winAGame(current, 'A');
    }
    expect(currentSetOf(current).gamesWon).toEqual({ A: 2, B: 0 });
    expect(currentSetOf(current).winner).toBeNull();
    expect(current.sets).toHaveLength(1);

    current = winAGame(current, 'A'); // 3rd game win -> set won

    expect(current.sets[0].winner).toBe('A');
    expect(current.sets[0].gamesWon).toEqual({ A: 3, B: 0 });
    expect(current.sets).toHaveLength(2); // next set auto-started
    expect(currentSetOf(current).winner).toBeNull();
    expect(currentSetOf(current).games).toHaveLength(1);
  });
});

describe('match win rule', () => {
  function winASet(match: Match, winner: Player, gamesToWinSet: number): Match {
    const loser: Player = winner === 'A' ? 'B' : 'A';
    let current = match;
    for (let i = 0; i < gamesToWinSet; i += 1) {
      current = scorePoints(scorePoints(current, loser, 5), winner, 11);
    }
    return current;
  }

  it('wins the match once a player reaches the configured sets-to-win-match threshold', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 3 });
    const match = createMatch(config);

    let current = winASet(match, 'A', 3);
    current = winASet(current, 'A', 3);
    expect(current.setsWon).toEqual({ A: 2, B: 0 });
    expect(current.winner).toBeNull();
    expect(isMatchComplete(current)).toBe(false);

    const matchWon = winASet(current, 'A', 3);

    expect(matchWon.setsWon).toEqual({ A: 3, B: 0 });
    expect(matchWon.winner).toBe('A');
    expect(isMatchComplete(matchWon)).toBe(true);
  });
});

describe('manual overrides', () => {
  it("overrides a set's aggregated game count without recalculating the set winner", () => {
    const match = createMatch(makeConfig({ gamesToWinSet: 3 }));

    const bumped = adjustSetGamesWon(match, 0, 'A', 1);
    expect(bumped.sets[0].gamesWon).toEqual({ A: 1, B: 0 });
    expect(bumped.sets[0].winner).toBeNull();

    // Push past the threshold via manual overrides only; no auto-win/new set.
    const atThreshold = adjustSetGamesWon(adjustSetGamesWon(bumped, 0, 'A', 1), 0, 'A', 1);
    expect(atThreshold.sets[0].gamesWon).toEqual({ A: 3, B: 0 });
    expect(atThreshold.sets[0].winner).toBeNull();
    expect(atThreshold.sets).toHaveLength(1);
  });

  it('decrements and clamps a set game count at zero', () => {
    const match = createMatch(makeConfig());

    const decremented = adjustSetGamesWon(match, 0, 'A', -1);

    expect(decremented.sets[0].gamesWon).toEqual({ A: 0, B: 0 });
  });

  it("overrides the match's aggregated set count without recalculating the match winner", () => {
    const match = createMatch(makeConfig({ setsToWinMatch: 3 }));

    const atThreshold = adjustMatchSetsWon(
      adjustMatchSetsWon(adjustMatchSetsWon(match, 'B', 1), 'B', 1),
      'B',
      1,
    );

    expect(atThreshold.setsWon).toEqual({ A: 0, B: 3 });
    expect(atThreshold.winner).toBeNull();
    expect(isMatchComplete(atThreshold)).toBe(false);
  });

  it('decrements and clamps the match set count at zero', () => {
    const match = createMatch(makeConfig());

    const decremented = adjustMatchSetsWon(match, 'B', -1);

    expect(decremented.setsWon).toEqual({ A: 0, B: 0 });
  });

  it('can override an earlier, already-finished set within a still-open match', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 3 });
    const match = createMatch(config);

    let current = match;
    for (let i = 0; i < 3; i += 1) {
      current = scorePoints(scorePoints(current, 'B', 5), 'A', 11);
    }
    expect(current.sets[0].winner).toBe('A');
    expect(current.sets).toHaveLength(2);

    const corrected = adjustSetGamesWon(current, 0, 'B', 1);

    expect(corrected.sets[0].gamesWon).toEqual({ A: 3, B: 1 });
    expect(corrected.sets[0].winner).toBe('A'); // not recalculated
  });
});

describe('match completion locks the whole hierarchy', () => {
  function playToMatchWin(config: MatchConfig): Match {
    const match = createMatch(config);
    let current = match;
    for (let s = 0; s < config.setsToWinMatch; s += 1) {
      for (let g = 0; g < config.gamesToWinSet; g += 1) {
        current = scorePoints(scorePoints(current, 'B', 0), 'A', config.pointsToWin);
      }
    }
    return current;
  }

  it('rejects further points once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 });
    const won = playToMatchWin(config);
    expect(isMatchComplete(won)).toBe(true);

    const afterExtraPoint = addPoint(won, 'B');

    expect(afterExtraPoint).toBe(won); // unchanged reference: rejected outright
  });

  it('rejects undo once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(undoPoint(won)).toBe(won);
  });

  it('rejects a set game-count override once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(adjustSetGamesWon(won, 0, 'A', 1)).toBe(won);
  });

  it('rejects a match set-count override once the match is complete', () => {
    const config = makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 });
    const won = playToMatchWin(config);

    expect(adjustMatchSetsWon(won, 'A', 1)).toBe(won);
  });
});

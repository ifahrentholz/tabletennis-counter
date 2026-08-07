/**
 * Pure, UI-independent scoring domain logic for a table tennis match.
 *
 * Hierarchy: a `Match` contains `Game`s, each `Game` contains `Set`s, each
 * `Set` tracks a live per-player point count. All mutating operations return
 * a new `Match` value (the input is never mutated) so callers (persistence,
 * UI state) can treat `Match` as a plain, serializable snapshot.
 *
 * Winner determination:
 * - A set is won once a player reaches `pointsToWin` with at least a
 *   2-point lead (the official deuce rule).
 * - A game is won once a player has won `setsToWinGame` sets.
 * - A match is won once a player has won `gamesToWinMatch` games.
 *
 * Once `match.winner` is set, the entire hierarchy is frozen: every mutator
 * in this module becomes a no-op (returns the same match unchanged).
 */

export type Player = 'A' | 'B';

export interface MatchConfig {
  /** Point limit a set is played to (11 or 21), with the deuce rule beyond it. */
  pointsToWin: 11 | 21;
  /** Number of won sets needed to win a game. */
  setsToWinGame: 3 | 5 | 6 | 7;
  /** Number of won games needed to win the match. */
  gamesToWinMatch: 1 | 3 | 5;
  playerAName: string;
  playerBName: string;
}

export interface PlayerScore {
  A: number;
  B: number;
}

export interface SetState {
  points: PlayerScore;
  /**
   * Order in which points were awarded during this set, most recent last.
   * Used only to undo the most recently awarded point; never exposed for
   * editing directly.
   */
  pointLog: Player[];
  winner: Player | null;
}

export interface GameState {
  sets: SetState[];
  setsWon: PlayerScore;
  winner: Player | null;
}

export interface Match {
  config: MatchConfig;
  games: GameState[];
  gamesWon: PlayerScore;
  winner: Player | null;
}

function createSet(): SetState {
  return { points: { A: 0, B: 0 }, pointLog: [], winner: null };
}

function createGame(): GameState {
  return { sets: [createSet()], setsWon: { A: 0, B: 0 }, winner: null };
}

export function createMatch(config: MatchConfig): Match {
  return { config, games: [createGame()], gamesWon: { A: 0, B: 0 }, winner: null };
}

/** True once a player has won the match; the whole hierarchy is then frozen. */
export function isMatchComplete(match: Match): boolean {
  return match.winner !== null;
}

function currentGameIndex(match: Match): number {
  return match.games.length - 1;
}

function currentSetIndex(game: GameState): number {
  return game.sets.length - 1;
}

function setWinner(points: PlayerScore, pointsToWin: number): Player | null {
  if (points.A >= pointsToWin && points.A - points.B >= 2) return 'A';
  if (points.B >= pointsToWin && points.B - points.A >= 2) return 'B';
  return null;
}

function gameWinnerFrom(setsWon: PlayerScore, setsToWinGame: number): Player | null {
  if (setsWon.A >= setsToWinGame) return 'A';
  if (setsWon.B >= setsToWinGame) return 'B';
  return null;
}

function matchWinnerFrom(gamesWon: PlayerScore, gamesToWinMatch: number): Player | null {
  if (gamesWon.A >= gamesToWinMatch) return 'A';
  if (gamesWon.B >= gamesToWinMatch) return 'B';
  return null;
}

/**
 * Awards one point to `player` in the currently running set.
 *
 * Automatically resolves the set/game/match winner (deuce rule included).
 * When a set is won, a new set is started in the same game unless the game
 * itself is now won, in which case a new game is started unless the match
 * itself is now won. A no-op once the match is already complete.
 */
export function addPoint(match: Match, player: Player): Match {
  if (isMatchComplete(match)) return match;

  const gIdx = currentGameIndex(match);
  const game = match.games[gIdx];
  const sIdx = currentSetIndex(game);
  const set = game.sets[sIdx];

  const newPoints: PlayerScore = { ...set.points, [player]: set.points[player] + 1 };
  const newPointLog = [...set.pointLog, player];
  const wonSetBy = setWinner(newPoints, match.config.pointsToWin);

  const newSet: SetState = { points: newPoints, pointLog: newPointLog, winner: wonSetBy };
  const newSets = [...game.sets];
  newSets[sIdx] = newSet;

  if (!wonSetBy) {
    const newGame: GameState = { ...game, sets: newSets };
    const newGames = [...match.games];
    newGames[gIdx] = newGame;
    return { ...match, games: newGames };
  }

  const newSetsWon: PlayerScore = {
    ...game.setsWon,
    [wonSetBy]: game.setsWon[wonSetBy] + 1,
  };
  const wonGameBy = gameWinnerFrom(newSetsWon, match.config.setsToWinGame);

  const newGame: GameState = {
    sets: wonGameBy ? newSets : [...newSets, createSet()],
    setsWon: newSetsWon,
    winner: wonGameBy,
  };
  const newGames = [...match.games];
  newGames[gIdx] = newGame;

  if (!wonGameBy) {
    return { ...match, games: newGames };
  }

  const newGamesWon: PlayerScore = {
    ...match.gamesWon,
    [wonGameBy]: match.gamesWon[wonGameBy] + 1,
  };
  const wonMatchBy = matchWinnerFrom(newGamesWon, match.config.gamesToWinMatch);

  return {
    ...match,
    games: wonMatchBy ? newGames : [...newGames, createGame()],
    gamesWon: newGamesWon,
    winner: wonMatchBy,
  };
}

/**
 * Removes exactly the last point awarded in the currently running set, for
 * whichever player received it. A no-op when the current set has no points
 * yet awarded (there is nothing to undo — a previously completed set's
 * points are not reachable for editing) or when the match is complete.
 */
export function undoPoint(match: Match): Match {
  if (isMatchComplete(match)) return match;

  const gIdx = currentGameIndex(match);
  const game = match.games[gIdx];
  const sIdx = currentSetIndex(game);
  const set = game.sets[sIdx];

  if (set.pointLog.length === 0) return match;

  const lastPlayer = set.pointLog[set.pointLog.length - 1];
  const newSet: SetState = {
    points: { ...set.points, [lastPlayer]: set.points[lastPlayer] - 1 },
    pointLog: set.pointLog.slice(0, -1),
    winner: set.winner,
  };

  const newSets = [...game.sets];
  newSets[sIdx] = newSet;
  const newGame: GameState = { ...game, sets: newSets };
  const newGames = [...match.games];
  newGames[gIdx] = newGame;

  return { ...match, games: newGames };
}

/**
 * Manually adjusts the aggregated set count (`setsWon`) of the game at
 * `gameIndex` for `player` by `delta` (+1/-1, stepper-style). Does not
 * recalculate the game's winner or any higher level. Clamped at 0. A no-op
 * once the match is complete.
 */
export function adjustGameSetsWon(
  match: Match,
  gameIndex: number,
  player: Player,
  delta: 1 | -1,
): Match {
  if (isMatchComplete(match)) return match;
  if (gameIndex < 0 || gameIndex >= match.games.length) {
    throw new RangeError(`No game at index ${gameIndex}`);
  }

  const game = match.games[gameIndex];
  const newValue = Math.max(0, game.setsWon[player] + delta);
  const newGame: GameState = { ...game, setsWon: { ...game.setsWon, [player]: newValue } };

  const newGames = [...match.games];
  newGames[gameIndex] = newGame;

  return { ...match, games: newGames };
}

/**
 * Manually adjusts the aggregated game count (`gamesWon`) of the match for
 * `player` by `delta` (+1/-1, stepper-style). Does not recalculate the
 * match's winner. Clamped at 0. A no-op once the match is complete.
 */
export function adjustMatchGamesWon(match: Match, player: Player, delta: 1 | -1): Match {
  if (isMatchComplete(match)) return match;

  const newValue = Math.max(0, match.gamesWon[player] + delta);
  return { ...match, gamesWon: { ...match.gamesWon, [player]: newValue } };
}

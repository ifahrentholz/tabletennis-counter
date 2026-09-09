/**
 * Pure, UI-independent scoring domain logic for a table tennis match.
 *
 * Hierarchy: a `Match` contains `Set`s, each `Set` contains `Game`s, each
 * `Game` tracks a live per-player point count. All mutating operations
 * return a new `Match` value (the input is never mutated) so callers
 * (persistence, UI state) can treat `Match` as a plain, serializable
 * snapshot.
 *
 * Winner determination:
 * - A game is won once a player reaches `pointsToWin` with at least a
 *   2-point lead (the official deuce rule).
 * - A set is won once a player has won `gamesToWinSet` games.
 * - A match is won once a player has won `setsToWinMatch` sets.
 *
 * Once `match.winner` is set, the entire hierarchy is frozen: every mutator
 * in this module becomes a no-op (returns the same match unchanged).
 */

export type Player = 'A' | 'B';

export interface MatchConfig {
  /** Point limit a game is played to (11 or 21), with the deuce rule beyond it. */
  pointsToWin: 11 | 21;
  /** Number of won games needed to win a set. */
  gamesToWinSet: 3 | 5 | 6 | 7;
  /** Number of won sets needed to win the match. */
  setsToWinMatch: 1 | 3 | 5;
  playerAName: string;
  playerBName: string;
}

export interface PlayerScore {
  A: number;
  B: number;
}

export interface GameState {
  points: PlayerScore;
  /**
   * Order in which points were awarded during this game, most recent last.
   * Used only to undo the most recently awarded point; never exposed for
   * editing directly.
   */
  pointLog: Player[];
  winner: Player | null;
}

export interface SetState {
  games: GameState[];
  gamesWon: PlayerScore;
  winner: Player | null;
}

export interface Match {
  config: MatchConfig;
  sets: SetState[];
  setsWon: PlayerScore;
  winner: Player | null;
}

function createGame(): GameState {
  return { points: { A: 0, B: 0 }, pointLog: [], winner: null };
}

function createSet(): SetState {
  return { games: [createGame()], gamesWon: { A: 0, B: 0 }, winner: null };
}

export function createMatch(config: MatchConfig): Match {
  return { config, sets: [createSet()], setsWon: { A: 0, B: 0 }, winner: null };
}

/** True once a player has won the match; the whole hierarchy is then frozen. */
export function isMatchComplete(match: Match): boolean {
  return match.winner !== null;
}

function currentSetIndex(match: Match): number {
  return match.sets.length - 1;
}

function currentGameIndex(set: SetState): number {
  return set.games.length - 1;
}

function gameWinner(points: PlayerScore, pointsToWin: number): Player | null {
  if (points.A >= pointsToWin && points.A - points.B >= 2) return 'A';
  if (points.B >= pointsToWin && points.B - points.A >= 2) return 'B';
  return null;
}

function setWinnerFrom(gamesWon: PlayerScore, gamesToWinSet: number): Player | null {
  if (gamesWon.A >= gamesToWinSet) return 'A';
  if (gamesWon.B >= gamesToWinSet) return 'B';
  return null;
}

function matchWinnerFrom(setsWon: PlayerScore, setsToWinMatch: number): Player | null {
  if (setsWon.A >= setsToWinMatch) return 'A';
  if (setsWon.B >= setsToWinMatch) return 'B';
  return null;
}

/**
 * Awards one point to `player` in the currently running game.
 *
 * Automatically resolves the game/set/match winner (deuce rule included).
 * When a game is won, a new game is started in the same set unless the set
 * itself is now won, in which case a new set is started unless the match
 * itself is now won. A no-op once the match is already complete.
 */
export function addPoint(match: Match, player: Player): Match {
  if (isMatchComplete(match)) return match;

  const sIdx = currentSetIndex(match);
  const set = match.sets[sIdx];
  const gIdx = currentGameIndex(set);
  const game = set.games[gIdx];

  const newPoints: PlayerScore = { ...game.points, [player]: game.points[player] + 1 };
  const newPointLog = [...game.pointLog, player];
  const wonGameBy = gameWinner(newPoints, match.config.pointsToWin);

  const newGame: GameState = { points: newPoints, pointLog: newPointLog, winner: wonGameBy };
  const newGames = [...set.games];
  newGames[gIdx] = newGame;

  if (!wonGameBy) {
    const newSet: SetState = { ...set, games: newGames };
    const newSets = [...match.sets];
    newSets[sIdx] = newSet;
    return { ...match, sets: newSets };
  }

  const newGamesWon: PlayerScore = {
    ...set.gamesWon,
    [wonGameBy]: set.gamesWon[wonGameBy] + 1,
  };
  const wonSetBy = setWinnerFrom(newGamesWon, match.config.gamesToWinSet);

  const newSet: SetState = {
    games: wonSetBy ? newGames : [...newGames, createGame()],
    gamesWon: newGamesWon,
    winner: wonSetBy,
  };
  const newSets = [...match.sets];
  newSets[sIdx] = newSet;

  if (!wonSetBy) {
    return { ...match, sets: newSets };
  }

  const newSetsWon: PlayerScore = {
    ...match.setsWon,
    [wonSetBy]: match.setsWon[wonSetBy] + 1,
  };
  const wonMatchBy = matchWinnerFrom(newSetsWon, match.config.setsToWinMatch);

  return {
    ...match,
    sets: wonMatchBy ? newSets : [...newSets, createSet()],
    setsWon: newSetsWon,
    winner: wonMatchBy,
  };
}

/**
 * Removes exactly the last point awarded in the currently running game, for
 * whichever player received it. A no-op when the current game has no points
 * yet awarded (there is nothing to undo — a previously completed game's
 * points are not reachable for editing) or when the match is complete.
 */
export function undoPoint(match: Match): Match {
  if (isMatchComplete(match)) return match;

  const sIdx = currentSetIndex(match);
  const set = match.sets[sIdx];
  const gIdx = currentGameIndex(set);
  const game = set.games[gIdx];

  if (game.pointLog.length === 0) return match;

  const lastPlayer = game.pointLog[game.pointLog.length - 1];
  const newGame: GameState = {
    points: { ...game.points, [lastPlayer]: game.points[lastPlayer] - 1 },
    pointLog: game.pointLog.slice(0, -1),
    winner: game.winner,
  };

  const newGames = [...set.games];
  newGames[gIdx] = newGame;
  const newSet: SetState = { ...set, games: newGames };
  const newSets = [...match.sets];
  newSets[sIdx] = newSet;

  return { ...match, sets: newSets };
}

/**
 * Manually adjusts the aggregated game count (`gamesWon`) of the set at
 * `setIndex` for `player` by `delta` (+1/-1, stepper-style). Does not
 * recalculate the set's winner or any higher level. Clamped at 0. A no-op
 * once the match is complete.
 */
export function adjustSetGamesWon(
  match: Match,
  setIndex: number,
  player: Player,
  delta: 1 | -1,
): Match {
  if (isMatchComplete(match)) return match;
  if (setIndex < 0 || setIndex >= match.sets.length) {
    throw new RangeError(`No set at index ${setIndex}`);
  }

  const set = match.sets[setIndex];
  const newValue = Math.max(0, set.gamesWon[player] + delta);
  const newSet: SetState = { ...set, gamesWon: { ...set.gamesWon, [player]: newValue } };

  const newSets = [...match.sets];
  newSets[setIndex] = newSet;

  return { ...match, sets: newSets };
}

/**
 * Manually adjusts the aggregated set count (`setsWon`) of the match for
 * `player` by `delta` (+1/-1, stepper-style). Does not recalculate the
 * match's winner. Clamped at 0. A no-op once the match is complete.
 */
export function adjustMatchSetsWon(match: Match, player: Player, delta: 1 | -1): Match {
  if (isMatchComplete(match)) return match;

  const newValue = Math.max(0, match.setsWon[player] + delta);
  return { ...match, setsWon: { ...match.setsWon, [player]: newValue } };
}

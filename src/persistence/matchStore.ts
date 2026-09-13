/**
 * On-device persistence for the match hierarchy (Match/Sets/Games).
 *
 * Wraps the pure `Match` domain value (see `../domain/match.ts`) with the
 * identity/timestamp fields persistence needs — `id` and `updatedAt` —
 * without changing `Match`'s own exported shape (see ADR 0002 §6). Callers
 * (UI state, future tickets) treat a `Match` as an immutable value and call
 * `saveMatch` after every domain mutation; there is no explicit "save"
 * action anywhere in the app, this module IS the autosave.
 *
 * Storage engine: `@react-native-async-storage/async-storage`. The full
 * match hierarchy is a single JSON-serializable value with no relational
 * querying needs (list/get/save/delete by id, sorted by `updatedAt`), so a
 * simple key-value store is sufficient and avoids the added complexity of a
 * SQL schema for this shape.
 *
 * Storing the domain value verbatim does mean that renaming a domain field
 * renames a storage field. Every read therefore goes through `parseStored`,
 * which upgrades records written before the #33 hierarchy rename (ADR 0011)
 * to the current names — see `migrateLegacyMatch`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState, Match, MatchConfig, Player, PlayerScore } from '../domain/match';

/** A persisted match: the pure domain `Match` plus persistence identity. */
export interface StoredMatch {
  id: string;
  updatedAt: number;
  match: Match;
}

/**
 * The match as it was persisted before #33, when the two middle levels of
 * the hierarchy carried each other's names: a `Match` held "games", each of
 * which held "sets". The innermost level (points plus point log) is
 * structurally identical to today's `GameState` — only the names above it
 * moved, never the nesting.
 */
interface LegacyMatch {
  config: LegacyMatchConfig;
  /** Today's `Match.sets`. */
  games: LegacySet[];
  /** Today's `Match.setsWon`. */
  gamesWon: PlayerScore;
  winner: Player | null;
}

interface LegacySet {
  /** Today's `SetState.games`. */
  sets: GameState[];
  /** Today's `SetState.gamesWon`. */
  setsWon: PlayerScore;
  winner: Player | null;
}

interface LegacyMatchConfig {
  pointsToWin: MatchConfig['pointsToWin'];
  /** Today's `MatchConfig.gamesToWinSet`. */
  setsToWinGame: MatchConfig['gamesToWinSet'];
  /** Today's `MatchConfig.setsToWinMatch`. */
  gamesToWinMatch: MatchConfig['setsToWinMatch'];
  playerAName: string;
  playerBName: string;
}

const KEY_PREFIX = '@tabletennis-counter/match/';

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A stored match predates #33 exactly when it still carries the `games`
 * list the rename turned into `sets`.
 *
 * The shape itself is the version marker: there is no version field, and
 * adding one now would not help, because the records already on devices
 * would not carry it either. The two shapes are told apart by a key only
 * one of them has ever had.
 */
function isLegacyMatch(match: Match | LegacyMatch): match is LegacyMatch {
  return 'games' in match;
}

/**
 * Renames a pre-#33 match's fields to their current names.
 *
 * A pure rename is all that is needed: #33 swapped what the two middle
 * levels are called, not which level sits where, so every count and every
 * point log is carried over untouched and no score is recomputed.
 */
function migrateLegacyMatch(legacy: LegacyMatch): Match {
  const { setsToWinGame, gamesToWinMatch, ...config } = legacy.config;

  return {
    config: { ...config, gamesToWinSet: setsToWinGame, setsToWinMatch: gamesToWinMatch },
    sets: legacy.games.map((legacySet) => ({
      games: legacySet.sets,
      gamesWon: legacySet.setsWon,
      winner: legacySet.winner,
    })),
    setsWon: legacy.gamesWon,
    winner: legacy.winner,
  };
}

/**
 * Parses one stored record, migrating it if it predates #33.
 *
 * The migration is applied on read only; nothing is written back here. A
 * migrated match is persisted in the current shape by the very next
 * `saveMatch`, which every screen issues after every change anyway — and
 * writing during `listMatches` would have to bump `updatedAt`, silently
 * reordering the list the player is looking at.
 */
interface LegacyStoredMatch {
  id: string;
  updatedAt: number;
  match: LegacyMatch;
}

function parseStored(value: string): StoredMatch {
  const stored = JSON.parse(value) as StoredMatch | LegacyStoredMatch;

  if (!isLegacyMatch(stored.match)) return stored as StoredMatch;

  return {
    id: stored.id,
    updatedAt: stored.updatedAt,
    match: migrateLegacyMatch(stored.match),
  };
}

/**
 * Persists `match` immediately.
 *
 * Pass no `id` to create a new match (a fresh id is generated); pass an
 * existing match's `id` to persist a state change to it. Either way,
 * `updatedAt` is set to the current time. Returns the resulting
 * `StoredMatch`, so a newly created match's `id` is available to the caller
 * for subsequent updates.
 */
export async function saveMatch(match: Match, id?: string): Promise<StoredMatch> {
  const stored: StoredMatch = { id: id ?? createId(), updatedAt: Date.now(), match };
  await AsyncStorage.setItem(keyFor(stored.id), JSON.stringify(stored));
  return stored;
}

/** Retrieves the match saved under `id`, or `null` if none exists. */
export async function getMatch(id: string): Promise<StoredMatch | null> {
  const value = await AsyncStorage.getItem(keyFor(id));
  return value ? parseStored(value) : null;
}

/** Lists every saved match, sorted by `updatedAt` descending (newest first). */
export async function listMatches(): Promise<StoredMatch[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const matchKeys = allKeys.filter((key) => key.startsWith(KEY_PREFIX));
  if (matchKeys.length === 0) return [];

  const entries = await AsyncStorage.multiGet(matchKeys);
  const matches = entries
    .map(([, value]) => (value ? parseStored(value) : null))
    .filter((stored): stored is StoredMatch => stored !== null);

  return matches.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Deletes the match saved under `id`. A no-op if no match exists there. */
export async function deleteMatch(id: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(id));
}

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
 * simple key-value store is sufficient and avoids the added complexity of
 * a SQL schema/migrations for this shape.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Match } from '../domain/match';

/** A persisted match: the pure domain `Match` plus persistence identity. */
export interface StoredMatch {
  id: string;
  updatedAt: number;
  match: Match;
}

const KEY_PREFIX = '@tabletennis-counter/match/';

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  return value ? (JSON.parse(value) as StoredMatch) : null;
}

/** Lists every saved match, sorted by `updatedAt` descending (newest first). */
export async function listMatches(): Promise<StoredMatch[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const matchKeys = allKeys.filter((key) => key.startsWith(KEY_PREFIX));
  if (matchKeys.length === 0) return [];

  const entries = await AsyncStorage.multiGet(matchKeys);
  const matches = entries
    .map(([, value]) => (value ? (JSON.parse(value) as StoredMatch) : null))
    .filter((stored): stored is StoredMatch => stored !== null);

  return matches.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Deletes the match saved under `id`. A no-op if no match exists there. */
export async function deleteMatch(id: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(id));
}

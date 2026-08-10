/**
 * Match list screen (screen 1 in the spec's navigation structure) — the
 * app's entry point.
 *
 * Lists every persisted match (running and finished), sorted by
 * most-recently-changed first (`../persistence/matchStore.ts`'s
 * `listMatches` already returns them in that order, so this screen renders
 * them as-is with no re-sorting of its own). Each row is labelled
 * "playerAName vs playerBName"; tapping any row — running or finished —
 * calls `onOpenMatch` with that match's id, handing off to the same games
 * overview (`MatchDetailScreen`, screen 3) either way. Read-only enforcement
 * for a finished match is not this screen's job: `isMatchComplete` already
 * makes the entire downstream hierarchy (games overview, sets overview,
 * point counter) read-only regardless of how it was reached, per #2's
 * "freeze on match.winner" contract and #6's `!isMatchComplete` gates. This
 * screen only shows a "Beendet"/"Läuft" hint per row so a finished match is
 * recognizable before it's even opened.
 *
 * A match can be removed via a dedicated delete action per row (the spec's
 * "swipe/delete gesture (or delete button)" — a button is used here since
 * no gesture-handling dependency exists yet in this project). Per the
 * spec's "with confirmation" requirement, tapping delete first asks via a
 * native `Alert.alert` confirmation (Abbrechen/Löschen); only confirming
 * calls `deleteMatch` and updates local state, so the row disappears
 * without needing a full reload. Cancelling — or dismissing the alert —
 * leaves the match untouched.
 *
 * A single "Neues Match" action opens the setup form (#4) via
 * `onCreateMatch`, closing the loop described by the spec: launch app → see
 * all matches → resume or start one.
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isMatchComplete } from '../domain/match';
import { deleteMatch, listMatches } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';

export interface MatchListScreenProps {
  /** Navigates into the games overview (screen 3) for the tapped match, running or finished. */
  onOpenMatch: (matchId: string) => void;
  /** Navigates to the setup form (#4) to start a new match. */
  onCreateMatch: () => void;
}

function labelFor(stored: StoredMatch): string {
  return `${stored.match.config.playerAName} vs ${stored.match.config.playerBName}`;
}

export function MatchListScreen({ onOpenMatch, onCreateMatch }: MatchListScreenProps) {
  const [matches, setMatches] = useState<StoredMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMatches().then((all) => {
      if (!cancelled) setMatches(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function confirmDelete(label: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Match löschen',
        `Möchtest du „${label}“ wirklich löschen?`,
        [
          { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Löschen', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  async function handleDelete(id: string, label: string) {
    const confirmed = await confirmDelete(label);
    if (!confirmed) return;
    await deleteMatch(id);
    setMatches((current) => current?.filter((stored) => stored.id !== id) ?? current);
  }

  return (
    <SafeAreaView style={styles.container} testID="match-list-safe-area">
      <Text style={styles.title}>Meine Matches</Text>

      <Pressable style={styles.newMatchButton} accessibilityRole="button" onPress={onCreateMatch}>
        <Text style={styles.newMatchButtonText}>Neues Match</Text>
      </Pressable>

      {matches === null ? (
        <Text>Lade…</Text>
      ) : matches.length === 0 ? (
        <Text style={styles.emptyText}>Noch keine Matches vorhanden.</Text>
      ) : (
        <View style={styles.list}>
          {matches.map((stored) => {
            const label = labelFor(stored);
            const complete = isMatchComplete(stored.match);
            return (
              <View key={stored.id} style={styles.listItem}>
                <Pressable
                  style={styles.matchButton}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => onOpenMatch(stored.id)}
                >
                  <Text style={styles.listItemText}>{label}</Text>
                  <Text style={styles.statusText}>{complete ? 'Beendet' : 'Läuft'}</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} löschen`}
                  onPress={() => handleDelete(stored.id, label)}
                >
                  <Text style={styles.deleteButtonText}>Löschen</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  newMatchButton: {
    alignSelf: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  newMatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    color: '#555',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

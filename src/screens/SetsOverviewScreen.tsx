/**
 * Sets overview screen (screen 4 in the spec's navigation structure) for a
 * single game.
 *
 * Shows the sets standing for both players within that specific game and
 * the list of sets played in it; tapping a set navigates into the live
 * point counter (screen 5, `PointCounterScreen`). Per the domain engine
 * (`../domain/match.ts`) there is only ever one live set across the whole
 * match — `addPoint`/`undoPoint` only ever act on `match.games.at(-1)`'s
 * last set — so every set row opens that same point counter regardless of
 * which row was tapped; older, already-decided sets have no live counter of
 * their own to open, matching user story #17's "current/selected set".
 *
 * While the match is not yet won, an "Editieren" button opens a
 * stepper-based edit mode that manually overwrites this game's aggregated
 * sets-won count per player via `adjustGameSetsWon` — available even for an
 * earlier, already-completed game of the same match, per the spec's edit
 * mode contract. It never recalculates this game's winner. The button
 * disappears entirely once the match is won.
 *
 * Like `PointCounterScreen` and `MatchDetailScreen`, this screen owns its
 * own load/persist round-trip.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adjustGameSetsWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { PlayerStandRow } from './PlayerStandRow';

export interface SetsOverviewScreenProps {
  matchId: string;
  /** Index into `match.games` of the game whose sets standing this shows. */
  gameIndex: number;
  /** Navigates into the live point counter (screen 5). */
  onOpenPointCounter: (matchId: string) => void;
  /** Navigates one level up (to the games overview); never asks to save first. */
  onBack: () => void;
}

export function SetsOverviewScreen({
  matchId,
  gameIndex,
  onOpenPointCounter,
  onBack,
}: SetsOverviewScreenProps) {
  const [storedMatch, setStoredMatch] = useState<StoredMatch | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMatch(matchId).then((stored) => {
      if (!cancelled) setStoredMatch(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function adjustSetsWon(player: Player, delta: 1 | -1) {
    if (!storedMatch) return;
    const updatedMatch = adjustGameSetsWon(storedMatch.match, gameIndex, player, delta);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <View style={styles.container}>
        <Text>Lade…</Text>
      </View>
    );
  }

  const { match } = storedMatch;
  const game = match.games[gameIndex];
  const matchComplete = isMatchComplete(match);

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} accessibilityRole="button" onPress={onBack}>
        <Text style={styles.backButtonText}>Zurück</Text>
      </Pressable>

      <Text style={styles.title}>Spiel {gameIndex + 1}</Text>

      <View style={styles.standRow}>
        <PlayerStandRow
          label="Sätze"
          name={match.config.playerAName}
          value={game.setsWon.A}
          editing={editing && !matchComplete}
          onIncrement={() => adjustSetsWon('A', 1)}
          onDecrement={() => adjustSetsWon('A', -1)}
        />
        <PlayerStandRow
          label="Sätze"
          name={match.config.playerBName}
          value={game.setsWon.B}
          editing={editing && !matchComplete}
          onIncrement={() => adjustSetsWon('B', 1)}
          onDecrement={() => adjustSetsWon('B', -1)}
        />
      </View>

      {!matchComplete ? (
        <Pressable
          style={styles.editButton}
          accessibilityRole="button"
          onPress={() => setEditing((value) => !value)}
        >
          <Text style={styles.editButtonText}>{editing ? 'Fertig' : 'Editieren'}</Text>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {game.sets.map((set, index) => (
          <Pressable
            key={index}
            style={styles.listItem}
            accessibilityRole="button"
            onPress={() => onOpenPointCounter(matchId)}
          >
            <Text style={styles.listItemText}>
              Satz {index + 1}: {set.points.A}:{set.points.B}
              {set.winner
                ? ` – ${set.winner === 'A' ? match.config.playerAName : match.config.playerBName} gewinnt`
                : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  standRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  editButton: {
    alignSelf: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemText: {
    fontSize: 16,
  },
});

/**
 * Games overview screen (screen 3 in the spec's navigation structure).
 *
 * Shows the match's aggregated games standing for both players and the list
 * of games played so far; tapping a game navigates into its sets overview
 * (screen 4, `SetsOverviewScreen`). While the match is not yet won, an
 * "Editieren" button opens a stepper-based edit mode that manually
 * overwrites the aggregated games-won count via `adjustMatchGamesWon`
 * (../domain/match.ts) — it never recalculates the match winner itself,
 * matching the spec's "manual correction, no recalculation" edit-mode
 * contract. The button disappears entirely once the match is won.
 *
 * This replaces the interim stub from #4/#5 (ADR 0004 §5, ADR 0005 §3),
 * whose only job was proving a match id could be routed to and offering a
 * direct shortcut straight into the point counter. That shortcut is
 * superseded by the real navigation hierarchy this ticket introduces:
 * games overview -> sets overview -> point counter.
 *
 * Like `PointCounterScreen`, this screen owns its own load/persist
 * round-trip (loads by id on mount, `saveMatch`s immediately after every
 * edit) rather than lifting match state into `App`.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adjustMatchGamesWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { PlayerStandRow } from './PlayerStandRow';

export interface MatchDetailScreenProps {
  matchId: string;
  /** Navigates into the sets overview (screen 4) for the game at `gameIndex`. */
  onOpenSetsOverview: (matchId: string, gameIndex: number) => void;
  /** Navigates one level up; never asks to save first. */
  onBack: () => void;
}

export function MatchDetailScreen({ matchId, onOpenSetsOverview, onBack }: MatchDetailScreenProps) {
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

  async function adjustGamesWon(player: Player, delta: 1 | -1) {
    if (!storedMatch) return;
    const updatedMatch = adjustMatchGamesWon(storedMatch.match, player, delta);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <SafeAreaView style={styles.container} testID="match-detail-safe-area">
        <Text>Lade…</Text>
      </SafeAreaView>
    );
  }

  const { match } = storedMatch;
  const matchComplete = isMatchComplete(match);
  const winnerName =
    match.winner === 'A'
      ? match.config.playerAName
      : match.winner === 'B'
        ? match.config.playerBName
        : null;

  return (
    <SafeAreaView style={styles.container} testID="match-detail-safe-area">
      <Pressable style={styles.backButton} accessibilityRole="button" onPress={onBack}>
        <Text style={styles.backButtonText}>Zurück</Text>
      </Pressable>

      <Text style={styles.title}>
        {match.config.playerAName} vs {match.config.playerBName}
      </Text>

      {winnerName ? <Text style={styles.winnerBanner}>{winnerName} gewinnt das Match!</Text> : null}

      <View style={styles.standRow}>
        <PlayerStandRow
          label="Spiele"
          name={match.config.playerAName}
          value={match.gamesWon.A}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('A', 1)}
          onDecrement={() => adjustGamesWon('A', -1)}
        />
        <PlayerStandRow
          label="Spiele"
          name={match.config.playerBName}
          value={match.gamesWon.B}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('B', 1)}
          onDecrement={() => adjustGamesWon('B', -1)}
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
        {match.games.map((game, index) => (
          <Pressable
            key={index}
            style={styles.listItem}
            accessibilityRole="button"
            onPress={() => onOpenSetsOverview(matchId, index)}
          >
            <Text style={styles.listItemText}>
              Spiel {index + 1}: {game.setsWon.A}:{game.setsWon.B}
              {game.winner
                ? ` – ${game.winner === 'A' ? match.config.playerAName : match.config.playerBName} gewinnt`
                : ''}
            </Text>
          </Pressable>
        ))}
      </View>
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
  winnerBanner: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#16a34a',
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

/**
 * Live point counter screen (screen 5 in the spec's navigation structure).
 *
 * Shows the running point score of the currently active set and lets each
 * player be awarded (+1) or have their last point undone (-1) with a single
 * tap. All win detection (set/game/match, including the deuce rule) is
 * delegated entirely to the scoring engine (`../domain/match.ts`) — this
 * screen only renders whatever the engine currently considers the "current"
 * set/game and calls its pure mutators; it never computes a winner itself.
 *
 * Because `addPoint` already advances the engine's own "current game/current
 * set" pointer the moment a set (or game) is won, this single screen
 * instance carries the player continuously through set after set, game
 * after game, without any navigation of its own — the displayed score
 * resets to 0-0 for the new set automatically. Only once the match itself
 * is won does the engine stop advancing (the hierarchy freezes), which is
 * when this screen shows the match-won banner and disables further input.
 *
 * Owns its own persistence round-trip (loads the match by id on mount,
 * `saveMatch`s immediately after every point/undo — see ADR 0003). It takes
 * only `matchId` (no game/set index) because the engine only ever exposes
 * one live set across the whole match — `SetsOverviewScreen` (#6) always
 * routes here for "the current/active set" regardless of which set row was
 * tapped, per ADR 0006 §2.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addPoint, isMatchComplete, undoPoint } from '../domain/match';
import type { Match } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';

export interface PointCounterScreenProps {
  matchId: string;
  /** Navigates one level up (to the sets overview); never asks to save first. */
  onBack: () => void;
}

function currentGameOf(match: Match) {
  return match.games[match.games.length - 1];
}

function currentSetOf(match: Match) {
  const game = currentGameOf(match);
  return game.sets[game.sets.length - 1];
}

export function PointCounterScreen({ matchId, onBack }: PointCounterScreenProps) {
  const [storedMatch, setStoredMatch] = useState<StoredMatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMatch(matchId).then((stored) => {
      if (!cancelled) setStoredMatch(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function applyAndPersist(mutate: (match: Match) => Match) {
    if (!storedMatch) return;
    const updatedMatch = mutate(storedMatch.match);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <SafeAreaView style={styles.container} testID="point-counter-safe-area">
        <Text>Lade…</Text>
      </SafeAreaView>
    );
  }

  const { match } = storedMatch;
  const currentGame = currentGameOf(match);
  const currentSet = currentSetOf(match);
  const matchComplete = isMatchComplete(match);
  const winnerName =
    match.winner === 'A'
      ? match.config.playerAName
      : match.winner === 'B'
        ? match.config.playerBName
        : null;

  return (
    <SafeAreaView style={styles.container} testID="point-counter-safe-area">
      <Pressable style={styles.backButton} accessibilityRole="button" onPress={onBack}>
        <Text style={styles.backButtonText}>Zurück</Text>
      </Pressable>

      {winnerName ? <Text style={styles.winnerBanner}>{winnerName} gewinnt das Match!</Text> : null}

      <View style={styles.scoreRow}>
        <PlayerColumn
          name={match.config.playerAName}
          points={currentSet.points.A}
          setsWon={currentGame.setsWon.A}
          gamesWon={match.gamesWon.A}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'A'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
        <PlayerColumn
          name={match.config.playerBName}
          points={currentSet.points.B}
          setsWon={currentGame.setsWon.B}
          gamesWon={match.gamesWon.B}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'B'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
      </View>
    </SafeAreaView>
  );
}

interface PlayerColumnProps {
  name: string;
  points: number;
  setsWon: number;
  gamesWon: number;
  disabled: boolean;
  onPoint: () => void;
  onUndo: () => void;
}

function PlayerColumn({
  name,
  points,
  setsWon,
  gamesWon,
  disabled,
  onPoint,
  onUndo,
}: PlayerColumnProps) {
  return (
    <View style={styles.playerColumn}>
      <Text style={styles.playerName}>{name}</Text>
      <Text style={styles.pointsValue} accessibilityLabel={`Punktestand ${name}`}>
        {points}
      </Text>
      <Text style={styles.subScore} accessibilityLabel={`Sätze ${name}`}>
        Sätze: {setsWon}
      </Text>
      <Text style={styles.subScore} accessibilityLabel={`Spiele ${name}`}>
        Spiele: {gamesWon}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} +1`}
        disabled={disabled}
        style={[styles.pointButton, disabled && styles.buttonDisabled]}
        onPress={onPoint}
      >
        <Text style={styles.pointButtonText}>+1</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} -1`}
        disabled={disabled}
        style={[styles.undoButton, disabled && styles.buttonDisabled]}
        onPress={onUndo}
      >
        <Text style={styles.undoButtonText}>-1</Text>
      </Pressable>
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
  winnerBanner: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#16a34a',
  },
  scoreRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playerColumn: {
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  subScore: {
    fontSize: 14,
    color: '#555',
  },
  pointButton: {
    marginTop: 16,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pointButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  undoButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

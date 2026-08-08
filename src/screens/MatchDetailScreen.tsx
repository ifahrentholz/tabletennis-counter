/**
 * Match detail / games overview screen (screen 3 in the spec's navigation
 * structure).
 *
 * This ticket (#4) only needed to prove that starting a match navigates into
 * its detail view with the correct match id; the real games/sets overview
 * (games won per player, list of games, edit mode) lands in tickets #6/#7.
 *
 * #5 adds one piece of interim scaffolding on top of that stub: a direct
 * "Punkte zählen" button straight into the live point counter for the
 * match's current/active set (there is only ever one "current" set/game per
 * the scoring engine, see `../domain/match.ts`). This is deliberately
 * minimal — it is not the real games/sets overview UI, just enough
 * navigation plumbing to reach and exercise the point counter before #6/#7
 * exist, consistent with ADR 0004 §5's interim `Route` state machine.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface MatchDetailScreenProps {
  matchId: string;
  /** Navigates into the live point counter for this match's current/active set. */
  onOpenPointCounter: (matchId: string) => void;
}

export function MatchDetailScreen({ matchId, onOpenPointCounter }: MatchDetailScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match {matchId}</Text>
      <Pressable
        style={styles.pointCounterButton}
        accessibilityRole="button"
        onPress={() => onOpenPointCounter(matchId)}
      >
        <Text style={styles.pointCounterButtonText}>Punkte zählen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  pointCounterButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pointCounterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/**
 * Match detail / games overview screen (screen 3 in the spec's navigation
 * structure).
 *
 * This ticket (#4) only needs to prove that starting a match navigates into
 * its detail view with the correct match id; the real games/sets overview
 * (games won per player, list of games, edit mode) lands in tickets #5-#7.
 * Kept intentionally minimal until then.
 */

import { StyleSheet, Text, View } from 'react-native';

export interface MatchDetailScreenProps {
  matchId: string;
}

export function MatchDetailScreen({ matchId }: MatchDetailScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match {matchId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

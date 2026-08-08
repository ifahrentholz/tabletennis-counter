/**
 * A single player's aggregated stand (games-won or sets-won) with an
 * optional inline +/- stepper for edit mode.
 *
 * Shared by `MatchDetailScreen` (games overview, screen 3) and
 * `SetsOverviewScreen` (sets overview, screen 4) so both edit modes render
 * and label their steppers identically; `label` ("Spiele"/"Sätze")
 * disambiguates which aggregated count is being shown/edited.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface PlayerStandRowProps {
  /** Which aggregated count this row shows, e.g. "Spiele" or "Sätze". */
  label: string;
  name: string;
  value: number;
  /** Renders the +/- stepper when true; a plain read-only value otherwise. */
  editing: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function PlayerStandRow({
  label,
  name,
  value,
  editing,
  onIncrement,
  onDecrement,
}: PlayerStandRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.value} accessibilityLabel={`${label} ${name}`}>
        {label}: {value}
      </Text>

      {editing ? (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${name} -1`}
            style={styles.stepperButton}
            onPress={onDecrement}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${name} +1`}
            style={styles.stepperButton}
            onPress={onIncrement}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  stepperButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  stepperButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

/**
 * A single player's aggregated stand (games-won or sets-won) with an
 * optional inline +/- stepper for edit mode.
 *
 * Shared by `MatchDetailScreen` (games overview, screen 3) and
 * `SetsOverviewScreen` (sets overview, screen 4) so both edit modes render
 * and label their steppers identically; `label` ("Spiele"/"Sätze")
 * disambiguates which aggregated count is being shown/edited.
 *
 * Carries the same red/black bat identity as every other screen (ADR 0009)
 * via `PlayerTag`, with the count set in that player's ink; the two steppers
 * stay de-coloured, because colour here belongs to the players and not to
 * the controls.
 */

import { Pressable, Text, View } from 'react-native';

import { PlayerTag } from '../components/PlayerTag';
import type { Player } from '../domain/match';
import { hit, makeStyles, radius, space, stroke, type } from '../theme';

export interface PlayerStandRowProps {
  /** Which aggregated count this row shows, e.g. "Spiele" or "Sätze". */
  label: string;
  /** Which side of the bat this player is — A is red, B is black. */
  player: Player;
  name: string;
  value: number;
  /** Renders the +/- stepper when true; a plain read-only value otherwise. */
  editing: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function PlayerStandRow({
  label,
  player,
  name,
  value,
  editing,
  onIncrement,
  onDecrement,
}: PlayerStandRowProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <PlayerTag player={player} name={name} />
      <View style={styles.valueBlock} accessible accessibilityLabel={`${label} ${name}`}>
        <Text style={styles.valueLabel}>{label}: </Text>
        <Text style={[styles.value, player === 'A' ? styles.inkA : styles.inkB]}>{value}</Text>
      </View>

      {editing ? (
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${name} -1`}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
            onPress={onDecrement}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${name} +1`}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
            onPress={onIncrement}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minWidth: 0,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.scheme === 'dark' ? 0.22 : 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  value: {
    ...type.stand,
    textAlign: 'center',
  },
  valueBlock: {
    alignItems: 'center',
  },
  valueLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  inkA: {
    color: theme.player.A.ink,
  },
  inkB: {
    color: theme.player.B.ink,
  },
  stepper: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stepperButton: {
    minWidth: hit.min,
    minHeight: hit.min,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  stepperButtonText: {
    ...type.undo,
    color: theme.color.quietInk,
  },
}));

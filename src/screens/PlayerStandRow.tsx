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
      <Text
        style={[styles.value, player === 'A' ? styles.inkA : styles.inkB]}
        accessibilityLabel={`${label} ${name}`}
      >
        {label}: {value}
      </Text>

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
    alignItems: 'center',
    gap: space.xs,
  },
  value: {
    ...type.stand,
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
    marginTop: space.xs,
  },
  stepperButton: {
    minWidth: hit.min,
    minHeight: hit.min,
    borderRadius: radius.sm,
    borderWidth: stroke.hairline,
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  stepperButtonText: {
    ...type.undo,
    color: theme.color.quietInk,
  },
}));

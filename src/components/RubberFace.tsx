/**
 * The signature element at full size: one side of the bat, as a tappable
 * face.
 *
 * A competition bat has a red rubber on one side and a black rubber on the
 * other, and the physical detail that makes a rubber read as a rubber rather
 * than as a colour swatch is the pale blade edge showing where the sheet is
 * trimmed to the wood. That edge is drawn here — and it is also what holds
 * the dark scheme's deep red face at 3:1 against the dark table, so the
 * signature detail and the contrast floor are the same stroke.
 *
 * Used for awarding a point: between rallies you slap the red side or the
 * black side. It is `hit.slab` (96pt) tall — far past the 44pt minimum,
 * because it is hit from a metre away without looking.
 *
 * Purely presentational — props in, view out.
 */

import { Pressable, Text } from 'react-native';

import type { Player } from '../domain/match';
import { hit, makeStyles, radius, space, type } from '../theme';

export interface RubberFaceProps {
  player: Player;
  /** What the face reads, e.g. `+1`. */
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

export function RubberFace({
  player,
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: RubberFaceProps) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.face,
        player === 'A' ? styles.faceA : styles.faceB,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, player === 'A' ? styles.labelA : styles.labelB]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  face: {
    minHeight: hit.slab - space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.scheme === 'dark' ? 0.3 : 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  faceA: {
    backgroundColor: theme.player.A.faceFill,
    borderColor: theme.player.A.faceBorder,
    borderWidth: theme.player.A.faceBorderWidth,
  },
  faceB: {
    backgroundColor: theme.player.B.faceFill,
    borderColor: theme.player.B.faceBorder,
    borderWidth: theme.player.B.faceBorderWidth,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...type.face,
  },
  labelA: {
    color: theme.player.A.faceInk,
  },
  labelB: {
    color: theme.player.B.faceInk,
  },
}));

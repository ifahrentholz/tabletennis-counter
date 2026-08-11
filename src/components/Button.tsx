/**
 * The app's two non-identity control tiers.
 *
 * - `primary` — a solid slab in the action colour, which is taken from the
 *   white line markings painted on the table (bone on the dark table,
 *   table-green on the bright hall). One per screen at most.
 * - `quiet` — a stamped, wide-tracked label inside a hairline pill, the way
 *   text is printed on a bat handle or an umpire's scoreboard. Everything
 *   secondary and everything destructive uses it: red has become player
 *   identity, so destructive controls are de-coloured rather than red (see
 *   the spec, "two resolved conflicts").
 *
 * Both tiers are at least 44pt high, because the phone gets tapped between
 * rallies without being looked at properly; `size="large"` raises a quiet
 * control to the live counter's reading distance (used for undo).
 *
 * Purely presentational — props in, view out.
 */

import { Pressable, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { hit, makeStyles, radius, space, stroke, type } from '../theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  /** `large` sets the label at the live counter's reading size. */
  size?: 'default' | 'large';
  /**
   * Only pass this where the screen already exposed one — an unlabelled
   * button keeps taking its accessible name from `label`.
   */
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  accessibilityLabel,
  disabled,
  style,
}: ButtonProps) {
  const styles = useStyles();
  const isPrimary = variant === 'primary';
  const isLarge = size === 'large';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.quiet,
        isLarge && styles.large,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[isPrimary ? styles.primaryLabel : styles.quietLabel, isLarge && styles.largeLabel]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  base: {
    minHeight: hit.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  primary: {
    backgroundColor: theme.color.actionFill,
    borderWidth: stroke.hairline,
    borderColor: theme.color.actionFill,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.scheme === 'dark' ? 0.28 : 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  quiet: {
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingVertical: space.sm,
  },
  large: {
    minHeight: hit.comfortable,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    ...type.action,
    color: theme.color.actionInk,
  },
  quietLabel: {
    ...type.microAction,
    color: theme.color.quietInk,
  },
  largeLabel: {
    ...type.undo,
  },
}));

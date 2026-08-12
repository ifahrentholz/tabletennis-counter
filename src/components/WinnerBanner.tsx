/**
 * The match result, in the winner's own ink with their side of the bat drawn
 * as a bar down the left edge.
 *
 * It is deliberately *not* orange: ball orange means "this is where you are
 * right now", and a finished match is exactly what it no longer is.
 *
 * Because this banner only ever mounts at the moment the match is won, its
 * one-shot 220ms fade-and-rise is the win itself. Nothing loops.
 *
 * Purely presentational — props in, view out.
 */

import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import type { Player } from '../domain/match';
import { makeStyles, space, stroke, type } from '../theme';

export interface WinnerBannerProps {
  player: Player;
  /** The full, unchanged sentence, e.g. `Alice gewinnt das Match!`. */
  message: string;
}

export function WinnerBanner({ player, message }: WinnerBannerProps) {
  const styles = useStyles();
  // `useState` rather than `useRef` so the driver is created exactly once
  // without reading a ref during render.
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      <View style={[styles.bar, player === 'A' ? styles.barA : styles.barB]} />
      <View style={styles.copy}>
        <Text style={styles.label}>Ergebnis</Text>
        <Text style={[styles.message, player === 'A' ? styles.inkA : styles.inkB]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderTopWidth: stroke.hairline,
    borderBottomWidth: stroke.hairline,
    borderColor: theme.color.border,
    paddingVertical: space.sm,
  },
  bar: {
    alignSelf: 'stretch',
    width: stroke.line,
  },
  barA: {
    backgroundColor: theme.player.A.ink,
  },
  barB: {
    backgroundColor: theme.player.B.ink,
  },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  label: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  message: {
    ...type.label,
    flexShrink: 1,
    color: theme.color.textPrimary,
  },
  inkA: {
    color: theme.color.textPrimary,
  },
  inkB: {
    color: theme.color.textPrimary,
  },
}));

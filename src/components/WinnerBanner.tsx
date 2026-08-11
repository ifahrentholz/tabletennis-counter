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
import { makeStyles, radius, space, stroke, type } from '../theme';

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
      <Text style={[styles.message, player === 'A' ? styles.inkA : styles.inkB]}>{message}</Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: theme.color.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingRight: space.lg,
    overflow: 'hidden',
  },
  bar: {
    alignSelf: 'stretch',
    width: stroke.bar,
    borderTopRightRadius: radius.chip,
    borderBottomRightRadius: radius.chip,
  },
  barA: {
    backgroundColor: theme.player.A.ink,
  },
  barB: {
    backgroundColor: theme.player.B.ink,
  },
  message: {
    ...type.title,
    flexShrink: 1,
  },
  inkA: {
    color: theme.player.A.ink,
  },
  inkB: {
    color: theme.player.B.ink,
  },
}));

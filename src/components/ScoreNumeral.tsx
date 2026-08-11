/**
 * The live point score of one player, set as a scoreboard numeral: heavy,
 * tightly tracked, in that player's ink, at the size the spec asks for —
 * readable from about a metre away, well past the 48pt it used to be.
 *
 * `fontVariant: ['tabular-nums']` (via the `score` type token) keeps every
 * digit the same width, so the numeral does not shift sideways as the score
 * counts up.
 *
 * The one piece of motion in the app: when the number changes, it lands with
 * a single 240ms scale settle — the point arriving. Nothing here loops,
 * nothing runs on mount, and the animation drives only `transform`, so it
 * carries no state and no meaning of its own beyond "that just changed".
 *
 * Purely presentational — props in, view out.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import type { Player } from '../domain/match';
import { makeStyles, type } from '../theme';

export interface ScoreNumeralProps {
  player: Player;
  /** Used for the unchanged `Punktestand <name>` accessibility label. */
  name: string;
  points: number;
}

export function ScoreNumeral({ player, name, points }: ScoreNumeralProps) {
  const styles = useStyles();
  // `useState` rather than `useRef` so the driver is created exactly once
  // without reading a ref during render.
  const [scale] = useState(() => new Animated.Value(1));
  const shownPoints = useRef(points);

  useEffect(() => {
    if (shownPoints.current === points) return;
    shownPoints.current = points;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.07, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [points, scale]);

  return (
    <Animated.Text
      accessibilityLabel={`Punktestand ${name}`}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={[
        styles.numeral,
        player === 'A' ? styles.inkA : styles.inkB,
        { transform: [{ scale }] },
      ]}
    >
      {points}
    </Animated.Text>
  );
}

const useStyles = makeStyles((theme) => ({
  numeral: {
    ...type.score,
    textAlign: 'center',
  },
  inkA: {
    color: theme.player.A.ink,
  },
  inkB: {
    color: theme.player.B.ink,
  },
}));

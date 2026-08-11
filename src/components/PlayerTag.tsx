/**
 * A player's name carrying their side of the bat: a small rubber chip plus
 * the name set in that side's ink.
 *
 * This is the app's signature element at its smallest size, and it is
 * repeated on every screen where both players appear, so "red is Alice,
 * black is Bob" is learned once and holds everywhere.
 *
 * Colour never carries the distinction on its own — under protanopia red
 * reads close to black. Three cues are always present at the same time:
 * the name itself, the player's fixed position (A left, B right / A above,
 * B below), and the chip's *treatment* (player A's chip is filled, player
 * B's is drawn as a contour in the light scheme), which differs in lightness
 * rather than only in hue.
 *
 * Purely presentational — props in, view out.
 */

import { Text, View } from 'react-native';

import type { Player } from '../domain/match';
import { makeStyles, radius, space, stroke, type } from '../theme';

export interface PlayerTagProps {
  player: Player;
  name: string;
  /** `micro` for list rows and forms, `title` for the live counter. */
  size?: 'micro' | 'title';
  /**
   * Drop the chip where the screen already states the identity at full
   * size — on the live counter the 96pt rubber face below the name says it
   * far louder, and a 14pt chip is invisible from a metre away anyway.
   */
  chip?: boolean;
}

export function PlayerTag({ player, name, size = 'micro', chip = true }: PlayerTagProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      {chip ? <View style={[styles.chip, player === 'A' ? styles.chipA : styles.chipB]} /> : null}
      <Text
        style={[
          size === 'title' ? styles.nameTitle : styles.nameMicro,
          player === 'A' ? styles.inkA : styles.inkB,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  chip: {
    width: 14,
    height: 14,
    borderRadius: radius.chip,
    borderWidth: stroke.line,
  },
  chipA: {
    backgroundColor: theme.player.A.chipFill,
    borderColor: theme.player.A.chipBorder,
  },
  chipB: {
    backgroundColor: theme.player.B.chipFill,
    borderColor: theme.player.B.chipBorder,
  },
  nameMicro: {
    ...type.micro,
    flexShrink: 1,
  },
  nameTitle: {
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

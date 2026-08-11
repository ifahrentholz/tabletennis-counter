/**
 * The frame every screen sits in: the device-safe area, the scheme's ground
 * colour and the standard page inset, in one place.
 *
 * Purely presentational — props in, view out. It keeps the root
 * `SafeAreaView` (and its default `additive` edges from #27, ADR 0008) as the
 * outermost node, so the notch/status-bar and home-indicator behaviour each
 * screen already had is unchanged; only the paint is new.
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeStyles, space } from '../theme';

export interface ScreenProps {
  /** Kept per screen so the existing safe-area tests keep their handle. */
  testID: string;
  /** Extra layout for this screen's page rhythm (gaps, alignment). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Screen({ testID, style, children }: ScreenProps) {
  const styles = useStyles();

  return (
    <SafeAreaView testID={testID} style={[styles.root, style]}>
      {children}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
}));

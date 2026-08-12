/**
 * The single home for screen-level navigation and primary calls to action.
 *
 * Contextual actions stay with their content (editing a score, opening a
 * concrete game); actions that move between screens or advance a flow use
 * this bottom dock. That fixed placement gives every screen the same learned
 * interaction without exposing spacing and separator details to callers.
 */

import { View } from 'react-native';

import { makeStyles, space, stroke } from '../theme';
import { Button } from './Button';

export interface ScreenActionBarProps {
  label: string;
  onPress: () => void;
  kind?: 'navigation' | 'primary';
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ScreenActionBar({
  label,
  onPress,
  kind = 'navigation',
  disabled,
  accessibilityLabel,
}: ScreenActionBarProps) {
  const styles = useStyles();

  return (
    <View style={styles.bar}>
      <Button
        label={label}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        variant={kind === 'primary' ? 'primary' : 'quiet'}
        disabled={disabled}
        style={styles.action}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  bar: {
    borderTopWidth: stroke.hairline,
    borderTopColor: theme.color.border,
    paddingTop: space.md,
  },
  action: {
    alignSelf: 'stretch',
  },
}));

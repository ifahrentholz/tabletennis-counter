/**
 * A yes/no confirmation, asked in the app's own paint rather than by the
 * operating system.
 *
 * This replaces `Alert.alert`, which exists only on iOS and Android — it is
 * backed by `UIAlertController`/`AlertDialog`, and `react-native-web` ships
 * no implementation of it, so on the web build the delete confirmation would
 * simply never appear and the guard in front of a destructive action would
 * silently vanish. Rendering the question ourselves is what makes that
 * guard hold on all three platforms (see ADR 0010).
 *
 * Drawing it also settles a mismatch the native alert always had: the OS
 * dialog paints a destructive action red, but in this app red is player A's
 * side of the bat (ADR 0009). Both actions here are therefore `quiet`
 * buttons — de-coloured, exactly as the design system asks for destructive
 * controls — and the weight sits on the wording, not on a colour.
 *
 * Purely presentational — props in, view out. It holds no visibility state
 * of its own; the caller owns `visible` and both callbacks.
 */

import { Modal, Pressable, Text, View } from 'react-native';

import { makeStyles, radius, space, stroke, type } from '../theme';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  /** Short headline, e.g. `Match löschen`. */
  title: string;
  /** The full question, naming what is about to happen. */
  message: string;
  /** Label of the affirming action, e.g. `Löschen`. */
  confirmLabel: string;
  /** Label of the dismissing action, e.g. `Abbrechen`. */
  cancelLabel: string;
  onConfirm: () => void;
  /** Also called when the dialog is dismissed via the scrim, Escape or the Android back button. */
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = useStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's hardware back button and the web's Escape key both land
      // here; dismissing without choosing must mean "no", never "yes".
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        {/* Tapping outside the card is a dismissal, matching how the native
            alert behaved with `cancelable: true`. It is deliberately not a
            button for assistive tech — the labelled cancel action is. */}
        <Pressable
          style={styles.scrimPress}
          accessibilityElementsHidden
          importantForAccessibility="no"
          onPress={onCancel}
        />
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button variant="quiet" label={cancelLabel} onPress={onCancel} style={styles.action} />
            <Button
              variant="quiet"
              label={confirmLabel}
              onPress={onConfirm}
              style={[styles.action, styles.confirm]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((theme) => ({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: theme.scheme === 'dark' ? 'rgba(0, 0, 0, 0.62)' : 'rgba(28, 33, 31, 0.42)',
  },
  scrimPress: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: space.md,
    padding: space.xl,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.scheme === 'dark' ? 0.36 : 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    ...type.title,
    color: theme.color.textPrimary,
  },
  message: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
    marginTop: space.xs,
  },
  action: {
    minWidth: 112,
  },
  confirm: {
    backgroundColor: theme.color.surfaceMuted,
    borderWidth: stroke.line,
    borderColor: theme.color.borderStrong,
  },
}));

/**
 * Turns a theme-dependent style factory into a hook.
 *
 * `StyleSheet.create` cannot be called at module scope any more once styles
 * read colours from the active scheme, so each screen declares its styles as
 * a factory and gets a hook back:
 *
 * ```ts
 * const useStyles = makeStyles((theme) => ({ ... }));
 * // inside the component:
 * const styles = useStyles();
 * ```
 *
 * There are only ever two schemes, so each sheet is built at most twice for
 * the lifetime of the process and cached by scheme — a re-render never
 * rebuilds a `StyleSheet`.
 */

import { StyleSheet } from 'react-native';

import type { Scheme, Theme } from './palette';
import { useTheme } from './useTheme';

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): () => T {
  const cache = new Map<Scheme, T>();

  return function useStyles(): T {
    const theme = useTheme();
    let sheet = cache.get(theme.scheme);
    if (!sheet) {
      sheet = StyleSheet.create(factory(theme));
      cache.set(theme.scheme, sheet);
    }
    return sheet;
  };
}

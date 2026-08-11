/**
 * Resolves the active theme from the operating system's appearance setting.
 *
 * There is no in-app toggle on purpose: the phone lies next to the table and
 * gets glanced at, not configured, so the hall's lighting is already
 * answered by whatever the device is set to. `app.json` sets
 * `userInterfaceStyle: "automatic"` so the OS setting actually reaches the
 * app.
 *
 * `themes.light` / `themes.dark` are module-level constants, so the returned
 * object is referentially stable per scheme — which is what lets
 * `makeStyles` cache one `StyleSheet` per scheme instead of rebuilding it on
 * every render.
 */

import { useColorScheme } from 'react-native';

import { themes } from './palette';
import type { Theme } from './palette';

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

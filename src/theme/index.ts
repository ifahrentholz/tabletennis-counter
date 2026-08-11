/**
 * The single source of truth for the app's visual design.
 *
 * Screens import colour, spacing, radius, stroke, hit-area and type tokens
 * from here and hold no literal colour values of their own.
 */

export { themes } from './palette';
export type { IdentityColors, Scheme, Theme, ThemeColors } from './palette';
export { hit, radius, space, stroke, type } from './tokens';
export { makeStyles } from './makeStyles';
export { useTheme } from './useTheme';

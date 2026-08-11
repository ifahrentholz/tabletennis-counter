/**
 * Scheme-independent design tokens: spacing, radius, hit areas and the type
 * scale.
 *
 * The type scale is deliberately jumpy rather than evenly stepped, because
 * the app is read at two very different distances (see the spec, "usage
 * context"): the live counter is read from about a metre away next to the
 * table, everything else at normal phone reading distance. So `score` sits
 * far above the rest of the scale, and the small end (`micro`) is a printed
 * label, not body copy.
 *
 * Personality comes from weight, size jump and tracking on the system font —
 * no custom typeface is loaded, so nothing has to be downloaded before a
 * score can be read. `micro` borrows the wide-tracked, all-caps look of the
 * text stamped on bat handles and umpire scoreboards; the numerals borrow
 * the tight, heavy setting of a scoreboard's flip cards.
 *
 * Every numeral style carries `fontVariant: ['tabular-nums']` so a score
 * does not change width as it counts up.
 */

import type { TextStyle } from 'react-native';

const text = (style: TextStyle): TextStyle => style;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  chip: 5,
  sm: 8,
  md: 14,
  lg: 22,
} as const;

export const hit = {
  /** Smallest tappable edge the app ships — WCAG 2.5.5 / platform minimum. */
  min: 44,
  /** Comfortable one-handed control. */
  comfortable: 52,
  /** A between-rallies target, hit without looking. */
  slab: 96,
} as const;

/** Stroke widths, so a "drawn" light scheme stays consistent. */
export const stroke = {
  hairline: 1,
  line: 2,
  bar: 4,
} as const;

export const type = {
  /** The live score. Read at ~1 m. */
  score: text({
    fontSize: 92,
    fontWeight: '800',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  }),
  /** The "+1" on a rubber face. */
  face: text({
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  }),
  /** An aggregated stand ("Spiele: 3"). */
  stand: text({
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  }),
  /** Screen heading. */
  display: text({
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  }),
  /** Section or player heading. */
  title: text({
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  }),
  body: text({
    fontSize: 17,
    fontWeight: '500',
  }),
  bodyStrong: text({
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  }),
  /** Form label / list value. */
  label: text({
    fontSize: 15,
    fontWeight: '600',
  }),
  /** Stamped label: all caps, widely tracked. */
  micro: text({
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  }),
  /** Same stamped label, sized to be tapped. */
  microAction: text({
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  }),
  /** Primary action slab. */
  action: text({
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  }),
  /** Undo, at the counter's reading distance. */
  undo: text({
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  }),
} as const;

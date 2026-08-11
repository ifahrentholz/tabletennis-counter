/**
 * The app's colour palette, derived from the physical material of the sport
 * rather than from a generic UI palette.
 *
 * Three colour roles, each taken from a different physical object, so a
 * colour never means two things at once:
 *
 * 1. **Identity** — a competition bat carries, by ITTF rule, one red and one
 *    black rubber. Player A is the red side, player B is the black side.
 *    Identity colour is reserved for the players and never used for
 *    emphasis, actions or errors.
 * 2. **Surface** — the deep blue-green of a competition table. In the dark
 *    scheme it is the ground the app is painted on; in the light scheme the
 *    same blue-green becomes the *ink* (see below).
 * 3. **Status** — the matt orange of the ball, used only for "this is where
 *    you are right now" (the running game/set). Never decoration.
 *
 * Actions borrow a fourth material: the white line markings of the table
 * (`actionFill`/`actionInk`) — bone on the dark table, table-green on the
 * bright hall floor.
 *
 * The two schemes are deliberately **not** inversions of each other:
 *
 * - dark = *the bat as material*: the table in hall shadow, both rubbers
 *   rendered as filled faces, each ringed by the pale blade edge that shows
 *   where the rubber is trimmed to the wood.
 * - light = *the bat as technical drawing*: a bright hall, table blue-green
 *   used as ink, and the black rubber drawn as a dark contour plus dark type
 *   — never as a filled black area, which would turn a daylight screen into
 *   a hole.
 *
 * Every text pair and every meaning-bearing boundary in both schemes is at
 * WCAG AA or better; the measured ratios are recorded in
 * `docs/adr/0009-visual-design-system.md`.
 */

export type Scheme = 'light' | 'dark';

/** One player's side of the bat, in every form the UI needs it. */
export interface IdentityColors {
  /** Type colour for this player's name and numbers. */
  ink: string;
  /** Fill of the large tappable "rubber face" (the +1 slab). */
  faceFill: string;
  /** Edge of the rubber face — the blade edge in dark, the contour in light. */
  faceBorder: string;
  /** Width of that edge, in points. */
  faceBorderWidth: number;
  /** Type colour on top of `faceFill`. */
  faceInk: string;
  /** Fill of the small identity chip repeated next to the player's name. */
  chipFill: string;
  /** Edge of that chip. */
  chipBorder: string;
}

export interface ThemeColors {
  /** Screen ground. */
  bg: string;
  /** Raised panel (list rows, notices). */
  surface: string;
  /** Recessed panel (unselected presets, muted blocks). */
  surfaceMuted: string;
  /** Decorative hairline. */
  border: string;
  /** Boundary of something tappable — held at 3:1 against `bg`. */
  borderStrong: string;
  /** The table's centre line, dividing the two players' halves. */
  centreLine: string;
  textPrimary: string;
  textSecondary: string;
  /** Ball orange, safe as type. Status only. */
  accent: string;
  /** Ball orange for bars and markers — held at 3:1 against `bg`. */
  accentMarker: string;
  /** Primary action slab (the table's white line markings). */
  actionFill: string;
  actionInk: string;
  /** Type colour of a quiet, de-coloured control (back, edit, delete, undo). */
  quietInk: string;
}

export interface Theme {
  scheme: Scheme;
  color: ThemeColors;
  player: { A: IdentityColors; B: IdentityColors };
}

const dark: Theme = {
  scheme: 'dark',
  color: {
    bg: '#07272C',
    surface: '#0E3A41',
    surfaceMuted: '#12464E',
    border: '#2F636A',
    borderStrong: '#6E9B9E',
    centreLine: '#C8D8D5',
    textPrimary: '#F2F7F5',
    textSecondary: '#A9C3C2',
    accent: '#FF8A3D',
    accentMarker: '#FF8A3D',
    actionFill: '#E8EFED',
    actionInk: '#07272C',
    quietInk: '#C7D8D5',
  },
  player: {
    A: {
      ink: '#FF7A82',
      faceFill: '#C4102B',
      faceBorder: '#C8D8D5',
      faceBorderWidth: 2,
      faceInk: '#FFFFFF',
      chipFill: '#C4102B',
      chipBorder: '#C8D8D5',
    },
    B: {
      ink: '#F2F7F5',
      faceFill: '#0B0F11',
      faceBorder: '#C8D8D5',
      faceBorderWidth: 2,
      faceInk: '#F2F7F5',
      chipFill: '#0B0F11',
      chipBorder: '#C8D8D5',
    },
  },
};

const light: Theme = {
  scheme: 'light',
  color: {
    bg: '#EBF1EF',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F8F6',
    border: '#C6D6D2',
    borderStrong: '#4A6B70',
    centreLine: '#0E4B54',
    textPrimary: '#062026',
    textSecondary: '#4A6B70',
    accent: '#9C3D06',
    accentMarker: '#D65A0A',
    actionFill: '#0E4B54',
    actionInk: '#FFFFFF',
    quietInk: '#4A6B70',
  },
  player: {
    A: {
      ink: '#A80E27',
      faceFill: '#A80E27',
      faceBorder: '#A80E27',
      faceBorderWidth: 3,
      faceInk: '#FFFFFF',
      chipFill: '#A80E27',
      chipBorder: '#A80E27',
    },
    B: {
      // Black as contour and type, never as a filled area (see file header).
      ink: '#121618',
      faceFill: '#E7EAE9',
      faceBorder: '#121618',
      faceBorderWidth: 3,
      faceInk: '#121618',
      chipFill: '#FFFFFF',
      chipBorder: '#121618',
    },
  },
};

export const themes: Record<Scheme, Theme> = { light, dark };

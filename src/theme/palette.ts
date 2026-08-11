/**
 * A neutral sports-broadcast palette with two clear player identities.
 *
 * The table green is reserved for primary actions and structural emphasis,
 * ball orange marks only the currently running item, and the red/black bat
 * faces remain the stable identity for players A and B.
 */

export type Scheme = 'light' | 'dark';

export interface IdentityColors {
  ink: string;
  faceFill: string;
  faceBorder: string;
  faceBorderWidth: number;
  faceInk: string;
  chipFill: string;
  chipBorder: string;
}

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  centreLine: string;
  textPrimary: string;
  textSecondary: string;
  textOnStrong: string;
  accent: string;
  accentMarker: string;
  actionFill: string;
  actionInk: string;
  quietInk: string;
  shadow: string;
}

export interface Theme {
  scheme: Scheme;
  color: ThemeColors;
  player: { A: IdentityColors; B: IdentityColors };
}

const dark: Theme = {
  scheme: 'dark',
  color: {
    bg: '#0B1110',
    surface: '#151D1B',
    surfaceMuted: '#1C2724',
    surfaceStrong: '#EAF0ED',
    border: '#2D3A36',
    borderStrong: '#7D8D86',
    centreLine: '#DCE7E2',
    textPrimary: '#F4F7F5',
    textSecondary: '#AAB8B2',
    textOnStrong: '#111917',
    accent: '#FFA14A',
    accentMarker: '#FFA14A',
    actionFill: '#F1F5F3',
    actionInk: '#15201D',
    quietInk: '#D7E1DC',
    shadow: '#000000',
  },
  player: {
    A: {
      ink: '#FF8291',
      faceFill: '#CE2641',
      faceBorder: '#FF9AA6',
      faceBorderWidth: 2,
      faceInk: '#FFFFFF',
      chipFill: '#FF5268',
      chipBorder: '#FF5268',
    },
    B: {
      ink: '#F4F7F5',
      faceFill: '#050807',
      faceBorder: '#AEBDB7',
      faceBorderWidth: 2,
      faceInk: '#FFFFFF',
      chipFill: '#F4F7F5',
      chipBorder: '#F4F7F5',
    },
  },
};

const light: Theme = {
  scheme: 'light',
  color: {
    bg: '#F2F4F1',
    surface: '#FFFFFF',
    surfaceMuted: '#E7ECE8',
    surfaceStrong: '#15201D',
    border: '#D2DAD5',
    borderStrong: '#68746F',
    centreLine: '#183B35',
    textPrimary: '#111817',
    textSecondary: '#56615D',
    textOnStrong: '#F7FAF8',
    accent: '#A93E05',
    accentMarker: '#DE5B16',
    actionFill: '#153F38',
    actionInk: '#FFFFFF',
    quietInk: '#31413C',
    shadow: '#101816',
  },
  player: {
    A: {
      ink: '#A9142D',
      faceFill: '#C91F3A',
      faceBorder: '#971227',
      faceBorderWidth: 2,
      faceInk: '#FFFFFF',
      chipFill: '#C91F3A',
      chipBorder: '#C91F3A',
    },
    B: {
      ink: '#111817',
      faceFill: '#141B19',
      faceBorder: '#141B19',
      faceBorderWidth: 2,
      faceInk: '#FFFFFF',
      chipFill: '#141B19',
      chipBorder: '#141B19',
    },
  },
};

export const themes: Record<Scheme, Theme> = { light, dark };

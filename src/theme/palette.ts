/**
 * Refined sports-broadcast palette. Warm graphite and paper-like neutrals
 * create the calm base; desaturated steel blue and terracotta identify the
 * competitors, while restrained copper is reserved for live state.
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
    bg: '#0D1211',
    surface: '#151B19',
    surfaceMuted: '#202825',
    surfaceStrong: '#1A2320',
    border: '#303B37',
    borderStrong: '#737F7A',
    centreLine: '#DADDD8',
    textPrimary: '#ECEFEB',
    textSecondary: '#9AA49F',
    textOnStrong: '#F4F5F1',
    accent: '#D09A67',
    accentMarker: '#C47D46',
    actionFill: '#839B91',
    actionInk: '#101613',
    quietInk: '#D8DDD9',
    shadow: '#000000',
  },
  player: {
    A: {
      ink: '#A7B5C5',
      faceFill: '#66788D',
      faceBorder: '#93A2B4',
      faceBorderWidth: 1,
      faceInk: '#FFFFFF',
      chipFill: '#66788D',
      chipBorder: '#93A2B4',
    },
    B: {
      ink: '#D2A29A',
      faceFill: '#9A655C',
      faceBorder: '#C08B82',
      faceBorderWidth: 1,
      faceInk: '#FFFFFF',
      chipFill: '#9A655C',
      chipBorder: '#C08B82',
    },
  },
};

const light: Theme = {
  scheme: 'light',
  color: {
    bg: '#F4F1EC',
    surface: '#FCFBF8',
    surfaceMuted: '#ECE8E1',
    surfaceStrong: '#202725',
    border: '#DDD7CE',
    borderStrong: '#777B77',
    centreLine: '#F7F6F2',
    textPrimary: '#202522',
    textSecondary: '#6F756F',
    textOnStrong: '#F7F6F2',
    accent: '#865E37',
    accentMarker: '#A56737',
    actionFill: '#344A43',
    actionInk: '#FFFFFF',
    quietInk: '#38433F',
    shadow: '#1C211F',
  },
  player: {
    A: {
      ink: '#52677E',
      faceFill: '#667E98',
      faceBorder: '#52677E',
      faceBorderWidth: 1,
      faceInk: '#FFFFFF',
      chipFill: '#667E98',
      chipBorder: '#52677E',
    },
    B: {
      ink: '#8A554D',
      faceFill: '#A26960',
      faceBorder: '#8A554D',
      faceBorderWidth: 1,
      faceInk: '#FFFFFF',
      chipFill: '#A26960',
      chipBorder: '#8A554D',
    },
  },
};

export const themes: Record<Scheme, Theme> = { light, dark };

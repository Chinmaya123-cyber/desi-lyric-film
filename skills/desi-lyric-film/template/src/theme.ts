// Palette and timing. Every code-drawn colour in the film comes from C (see references/style-guide.md).
import FILM from './film.json';

export const C = {
  // indie two-colour pairs
  greenHouse: '#116B09', flossy: '#FF7FAB',
  kindBerry: '#1F6BED', mellow: '#F4FF1E',
  velvet: '#6E1221', taffy: '#E76290',
  hotPink: '#FF4283', magenta: '#FF1EC7',
  blueVinyl: '#0759A2', deepRed: '#C60707',
  mutedBlue: '#518DFF', riviera: '#5196E8',
  // Indian accents
  rani: '#E0218A', peach: '#FBC2A9', scarlet: '#E8323C', marigold: '#F7B500', peacock: '#00756C',
  // ink + paper
  ink: '#2A0812', cream: '#FFF4E2', plum: '#7A0F3D',
};

// background fields a shot can sit on (the look-card colours + the marigold stage)
export const BG: Record<string, string> = {
  pink: '#FDAFBD', yellow: '#EDB956', orange: '#F99763', navy: '#253B61', teal: '#227383',
  magenta: '#F44484', green: '#287A58', marigold: C.marigold, cream: '#F6E7CF',
};

export const FPS = 24;
export const W = 1920;
export const H = 1080;
export const BPM: number = FILM.bpm;
export const B = 60 / BPM; // beat length (s)
export const BEAT0: number = FILM.beatOffset ?? 0; // video time of the first beat
export const DURATION_S: number = FILM.duration;
export const DURATION = Math.round(DURATION_S * FPS);

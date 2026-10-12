// Speeds use the existing 60 Hz reference frame. First alignment: 1.75s / 1.4s.
export const MOVEMENT_RADIUS = 4.2;
export const PRECISION_GAIN = 0.35;
export const GAME_CONFIG = {
  easy: { speed: 0.04, perfectTolerance: 0.26 },
  normal: { speed: 0.05, perfectTolerance: 0.15 },
} as const;

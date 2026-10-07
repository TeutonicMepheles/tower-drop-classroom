export const VISUAL_THEME = {
  background: "#102238",
  fog: { color: "#34525e", density: 0.026 },
  ambient: { color: "#b5d8ff", intensity: 0.75 },
  key: { color: "#fff0d6", intensity: 0.85 },
  feedback: { color: "#fff4ad", durationMs: 320, intensity: 0.8 },
} as const;
export const blockColor = (layer: number): string =>
  `hsl(${195 + (layer % 24) * 5}, 65%, 62%)`;

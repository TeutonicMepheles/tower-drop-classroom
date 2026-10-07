export type Difficulty = "easy" | "normal";
export const GAME_CONFIG = {
  easy: { speed: 0.026, perfectTolerance: 0.22 },
  normal: { speed: 0.039, perfectTolerance: 0.1 },
} as const;

export interface GameSnapshot {
  difficulty: Difficulty;
  phase: "ready" | "playing" | "ended";
  score: number;
  layers: number;
  perfectStreak: number;
  lastResult: "none" | "normal" | "perfect" | "miss";
}
export const STATE_EVENT = "tower-drop:state";
export const LANDED_EVENT = "tower-drop:landed";
export interface LandedDetail {
  perfect: boolean;
  index: number;
}

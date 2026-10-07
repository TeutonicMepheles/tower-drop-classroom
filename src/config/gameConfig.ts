export type Difficulty = "easy" | "normal";
import type { RewardId, RewardLevels } from "./rewards";
export const GAME_CONFIG = {
  easy: { speed: 0.026, perfectTolerance: 0.22 },
  normal: { speed: 0.039, perfectTolerance: 0.1 },
} as const;

export interface GameSnapshot {
  difficulty: Difficulty;
  phase: "ready" | "playing" | "reward" | "ended";
  score: number;
  layers: number;
  perfectStreak: number;
  lastResult: "none" | "normal" | "perfect" | "miss" | "rescue";
  rewards: RewardLevels;
  rewardChoices: RewardId[];
  layersUntilReward: number;
  shields: number;
  rescuesUsed: number;
  perfectCount: number;
  longestStreak: number;
  bestLayers: number;
  recordBroken: boolean;
}
export const STATE_EVENT = "tower-drop:state";
export const LANDED_EVENT = "tower-drop:landed";
export const REWARD_EVENT = "tower-drop:reward-applied";
export const RESCUE_EVENT = "tower-drop:rescued";
export interface RewardAppliedDetail {
  id: RewardId;
  index: number;
}
export interface RescueDetail {
  index: number;
}
export interface LandedDetail {
  perfect: boolean;
  index: number;
}

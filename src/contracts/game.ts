export type RewardId =
  | "repair"
  | "slow"
  | "precision"
  | "shield"
  | "perfectRepair"
  | "steady";
export type RewardLevels = Record<RewardId, number>;
export type Difficulty = "easy" | "normal";
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
export interface GameCommands {
  start(): void;
  drop(): void;
  setDifficulty(difficulty: Difficulty): void;
  chooseReward(id: RewardId): boolean;
}
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface BlockSize {
  width: number;
  height: number;
  depth: number;
}
export interface BlockData {
  id: number;
  position: Vector3;
  sizes: BlockSize;
  direction: "x" | "z";
  layer: number;
}
export type Records = Record<Difficulty, number>;

export type GameEvent =
  | { type: "landed"; block: BlockData; perfect: boolean }
  | { type: "fragment"; block: BlockData }
  | { type: "rescued"; blockId: number }
  | { type: "reward"; id: RewardId; blockId: number };

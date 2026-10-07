export type RewardId = "repair" | "slow" | "precision";
export const REWARD_INTERVAL = 5;
export const REWARDS = {
  repair: {
    title: "塔身修复",
    description: "塔顶宽、深各恢复 0.3，最多恢复至初始尺寸。",
    max: null,
  },
  slow: {
    title: "从容节奏",
    description: "移动速度降低 8%，本局最多选择 3 次。",
    max: 3,
  },
  precision: {
    title: "精准辅助",
    description: "完美判定范围增加基础值的 20%，本局最多选择 3 次。",
    max: 3,
  },
} as const;
export type RewardLevels = Record<RewardId, number>;
export const emptyRewards = (): RewardLevels => ({
  repair: 0,
  slow: 0,
  precision: 0,
});
export const availableRewards = (levels: RewardLevels): RewardId[] =>
  (Object.keys(REWARDS) as RewardId[]).filter(
    (id) => REWARDS[id].max === null || levels[id] < REWARDS[id].max
  );

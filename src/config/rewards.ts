export type RewardId =
  | "repair"
  | "slow"
  | "precision"
  | "shield"
  | "perfectRepair"
  | "steady";
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
  shield: {
    title: "安全护盾",
    description: "获得一次落空救援，最多储存 2 次；救援后当前块重新移动。",
    max: null,
  },
  perfectRepair: {
    title: "完美修复",
    description: "每次完美拼接后宽、深各恢复 0.03，最多叠加 3 次。",
    max: 3,
  },
  steady: {
    title: "稳固底座",
    description: "每次普通拼接恢复当次裁切损失的 15%，最多叠加至 45%。",
    max: 3,
  },
} as const;
export type RewardLevels = Record<RewardId, number>;
export const emptyRewards = (): RewardLevels => ({
  repair: 0,
  slow: 0,
  precision: 0,
  shield: 0,
  perfectRepair: 0,
  steady: 0,
});
export const availableRewards = (
  levels: RewardLevels,
  shields = 0
): RewardId[] =>
  (Object.keys(REWARDS) as RewardId[]).filter(
    (id) =>
      (id !== "shield" || shields < 2) &&
      (REWARDS[id].max === null || levels[id] < REWARDS[id].max)
  );

/** No duplicates; a narrow tower always gets a recovery choice. */
export function drawRewards(
  levels: RewardLevels,
  shields: number,
  narrow: boolean,
  random: () => number = Math.random,
  needsRepair = true
): RewardId[] {
  const pool = availableRewards(levels, shields).filter(
    (id) => id !== "repair" || needsRepair
  );
  const result: RewardId[] = [];
  if (narrow && needsRepair) {
    result.push("repair");
    pool.splice(pool.indexOf("repair"), 1);
  }
  while (result.length < 3 && pool.length > 0) {
    const index = Math.min(
      pool.length - 1,
      Math.max(0, Math.floor(random() * pool.length))
    );
    result.push(pool.splice(index, 1)[0]!);
  }
  return result;
}

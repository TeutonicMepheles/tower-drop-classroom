import type { RewardId, RewardLevels } from "@/contracts/game";
export type { RewardId, RewardLevels } from "@/contracts/game";
export const REWARD_INTERVAL = 5;
const REWARDS = {
  repair: { max: null },
  precision: { max: 3 },
  shield: { max: null },
  perfectRepair: { max: 3 },
  steady: { max: 3 },
} as const;

export const emptyRewards = (): RewardLevels => ({
  repair: 0,
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

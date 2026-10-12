import type { RewardId, RewardLevels } from "@/contracts/game";
export type { RewardId, RewardLevels } from "@/contracts/game";
export const REWARD_INTERVAL = 5;
const REWARDS = {
  repair: { max: null },
  precision: { max: 3 },
  shield: { max: null },
  perfectRepair: { max: 3 },
  steady: { max: 3 },
  magnetSupply: { max: null },
  repairSupply: { max: null },
  freezeSupply: { max: null },
} as const;

export const emptyRewards = (): RewardLevels => ({
  repair: 0,
  precision: 0,
  shield: 0,
  perfectRepair: 0,
  steady: 0,
  magnetSupply: 0,
  repairSupply: 0,
  freezeSupply: 0,
});
export const availableRewards = (
  levels: RewardLevels,
  shields = 0,
  freeSkillSlots = 0
): RewardId[] =>
  (Object.keys(REWARDS) as RewardId[]).filter(
    (id) =>
      (!id.endsWith("Supply") || freeSkillSlots > 0) &&
      (id !== "shield" || shields < 2) &&
      (REWARDS[id].max === null || levels[id] < REWARDS[id].max)
  );

/** No duplicates; a narrow tower always gets a recovery choice. */
export function drawRewards(
  levels: RewardLevels,
  shields: number,
  narrow: boolean,
  random: () => number = Math.random,
  needsRepair = true,
  freeSkillSlots = 0
): RewardId[] {
  const pool = availableRewards(levels, shields, freeSkillSlots).filter(
    (id) => id !== "repair" || needsRepair
  );
  const result: RewardId[] = [];
  if (narrow && needsRepair) {
    result.push("repair");
    pool.splice(pool.indexOf("repair"), 1);
  }
  if (freeSkillSlots > 0) {
    const supplies = pool.filter((id) => id.endsWith("Supply"));
    const index = Math.min(
      supplies.length - 1,
      Math.max(0, Math.floor(random() * supplies.length))
    );
    const supply = supplies[index];
    if (supply) {
      result.push(supply);
      // Reserve only one supply card so existing upgrades remain a real choice.
      for (let i = pool.length - 1; i >= 0; i--)
        if (pool[i]!.endsWith("Supply")) pool.splice(i, 1);
    }
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

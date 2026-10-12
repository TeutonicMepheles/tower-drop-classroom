import type { GameSnapshot, RewardId } from "@/contracts/game";
import { REWARD_LABELS } from "./catalog";
import type { IconName } from "@/ui/assets/icons";
interface RewardPresentation {
  icon: IconName;
  tone: "mint" | "blue" | "gold";
  kind: "instant" | "passive" | "resource";
  category: string;
  headline: string;
  shortName: string;
}
/** Display semantics only. Eligibility and effects remain owned by gameplay. */
export const REWARD_PRESENTATION: Record<RewardId, RewardPresentation> = {
  repair: {
    icon: "repair",
    tone: "mint",
    kind: "instant",
    category: "即时修复",
    headline: "恢复塔顶尺寸",
    shortName: "修复",
  },
  slow: {
    icon: "slow",
    tone: "blue",
    kind: "passive",
    category: "持续加成",
    headline: "多一点对齐时间",
    shortName: "减速",
  },
  precision: {
    icon: "precision",
    tone: "gold",
    kind: "passive",
    category: "持续加成",
    headline: "更容易完美拼接",
    shortName: "精准",
  },
  shield: {
    icon: "shield",
    tone: "blue",
    kind: "resource",
    category: "消耗道具",
    headline: "落空后可重试一次",
    shortName: "护盾",
  },
  perfectRepair: {
    icon: "perfectRepair",
    tone: "mint",
    kind: "passive",
    category: "持续加成",
    headline: "完美拼接后恢复尺寸",
    shortName: "完美修复",
  },
  steady: {
    icon: "steady",
    tone: "gold",
    kind: "passive",
    category: "持续加成",
    headline: "恢复部分裁切损失",
    shortName: "裁切修复",
  },
};
export const passiveRewards = (state: Readonly<GameSnapshot>): RewardId[] =>
  (Object.keys(REWARD_PRESENTATION) as RewardId[]).filter(
    (id) => REWARD_PRESENTATION[id].kind === "passive" && state.rewards[id] > 0
  );
export const rewardUpgrade = (
  id: RewardId,
  state: Readonly<GameSnapshot>
): string => {
  if (id === "repair") return "立即生效";
  if (id === "shield")
    return `护盾 ${state.shields} → ${state.shields + 1} / 2`;
  return `等级 ${state.rewards[id]} → ${state.rewards[id] + 1} / 3`;
};
export const rewardLabel = (id: RewardId): string => REWARD_LABELS[id].title;

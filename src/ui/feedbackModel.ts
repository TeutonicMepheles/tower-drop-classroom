import type { GameSnapshot, RewardId } from "@/contracts/game";
import { REWARD_LABELS } from "./rewards/catalog";
export interface FeedbackMessage {
  kind: "normal" | "perfect" | "streak" | "record" | "reward" | "rescue";
  title: string;
  detail: string;
  duration: number;
}
/** Pure presentation policy. Priority: rescue / reward / first record / streak / landing. */
export const feedbackMessage = (
  before: Readonly<GameSnapshot>,
  after: Readonly<GameSnapshot>
): FeedbackMessage | undefined => {
  if (after.phase !== "playing") return;
  if (before.phase === "reward") {
    const id = (Object.keys(after.rewards) as RewardId[]).find(
      (key) => after.rewards[key] > before.rewards[key]
    );
    return {
      kind: "reward",
      title:
        id === "repair"
          ? "修复完成"
          : id
            ? `已获得：${REWARD_LABELS[id].title}`
            : "奖励已生效",
      detail: "",
      duration: 1800,
    };
  }
  if (before.phase !== "playing") return;
  if (after.rescuesUsed > before.rescuesUsed)
    return {
      kind: "rescue",
      title: "护盾生效",
      detail: "本层重试",
      duration: 1800,
    };
  if (after.layers <= before.layers) return;
  const detail = `+${after.score - before.score}`;
  if (after.recordBroken && !before.recordBroken && before.bestLayers > 0)
    return {
      kind: "record",
      title: "新纪录！",
      detail: `${after.layers} 层 · ${detail}`,
      duration: 1900,
    };
  if (after.lastResult === "perfect" && after.perfectStreak >= 3)
    return {
      kind: "streak",
      title: `${after.perfectStreak} 连击！`,
      detail,
      duration: 1400,
    };
  return {
    kind: after.lastResult === "perfect" ? "perfect" : "normal",
    title: after.lastResult === "perfect" ? "完美拼接" : "",
    detail,
    duration: 1000,
  };
};

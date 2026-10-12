import type { GameSnapshot } from "@/contracts/game";
import { icon } from "@/ui/assets/icons";
import { createMotion } from "@/ui/motion";
import {
  REWARD_PRESENTATION,
  passiveRewards,
  rewardLabel,
} from "@/ui/rewards/presentation";
import { REWARD_LABELS } from "@/ui/rewards/catalog";
import { dots, find, setText } from "./primitives";
import type { View } from "./primitives";
export const createHud = (): View<GameSnapshot> => {
  const element = document.createElement("section");
  element.className = "game-hud";
  element.setAttribute("aria-label", "游戏状态");
  element.innerHTML = `
    <div class="hud-top"><div class="hud-metrics">
      <div class="hud-height"><span class="hud-caption">${icon("tower")} 当前层数</span><strong data-game-layers>0</strong></div>
      <div class="hud-secondary"><span class="hud-caption">得分</span><strong class="tower-drop__score" data-game-score>0</strong><span class="hud-record">${icon("trophy")} <span data-record>0</span><span class="sr-only">层纪录</span></span></div>
    </div><div class="hud-resources"><div class="shield-meter" role="img"><span class="shield-slot">${icon("shield")}</span><span class="shield-slot">${icon("shield")}</span><span class="hud-caption">护盾</span></div><div class="run-bonuses" aria-label="持续加成"></div></div></div>
    <div class="combo-badge" hidden>${icon("spark")}<span>完美连击</span><strong>×<span data-game-streak>0</span></strong></div>
    <div class="hud-bottom"><div class="reward-track" role="progressbar" aria-label="下次奖励进度" aria-valuemin="0" aria-valuemax="5">
      <div class="reward-track__header"><span>${icon("gift")} 下次奖励</span><span data-reward-distance></span></div><div class="reward-track__steps">${Array.from({ length: 5 }, () => "<i></i>").join("")}</div></div><p class="play-hint">短按落块 · 长按方块选择技能</p></div>`;
  let bonusKey = "";
  const motion = createMotion();
  let previous: Readonly<GameSnapshot> | undefined;
  return {
    element,
    update: (state): void => {
      element.hidden = state.phase !== "playing";
      setText(element, "[data-game-layers]", state.layers);
      setText(element, "[data-game-score]", state.score);
      setText(element, "[data-game-streak]", state.perfectStreak);
      setText(element, "[data-record]", state.bestLayers);
      const combo = find(element, ".combo-badge");
      combo.hidden = state.perfectStreak === 0;
      combo.dataset.charged = String(state.perfectStreak >= 5);
      find(element, ".shield-meter").setAttribute(
        "aria-label",
        `剩余护盾 ${state.shields} / 2`
      );
      element
        .querySelectorAll(".shield-slot")
        .forEach((slot, i) =>
          slot.classList.toggle("is-filled", i < state.shields)
        );
      const ids = passiveRewards(state);
      const key = ids.map((id) => `${id}:${state.rewards[id]}`).join("|");
      if (key !== bonusKey) {
        bonusKey = key;
        find(element, ".run-bonuses").innerHTML = ids
          .map((id) => {
            const meta = REWARD_PRESENTATION[id];
            return `<div class="bonus-chip" data-tone="${meta.tone}" title="${rewardLabel(id)}：${REWARD_LABELS[id].description}" aria-label="${rewardLabel(id)} ${state.rewards[id]}/3">${icon(meta.icon)}<span>${meta.shortName}${dots(state.rewards[id], 3)}</span></div>`;
          })
          .join("");
      }
      const progress = Math.max(0, Math.min(5, 5 - state.layersUntilReward));
      const track = find(element, ".reward-track");
      track.setAttribute("aria-valuenow", String(progress));
      track.setAttribute(
        "aria-valuetext",
        `再 ${state.layersUntilReward} 层到奖励层`
      );
      setText(element, "[data-reward-distance]", `${progress} / 5`);
      track
        .querySelectorAll("i")
        .forEach((step, i) => step.classList.toggle("is-filled", i < progress));
      find(element, ".play-hint").hidden = state.layers > 1;
      if (
        previous?.phase === "playing" &&
        state.phase === "playing" &&
        state.layers > previous.layers
      ) {
        motion.pop(find(element, "[data-game-layers]"));
        motion.pop(
          find(element, "[data-game-score]"),
          state.lastResult === "perfect"
        );
        if (state.perfectStreak > previous.perfectStreak)
          motion.pop(combo, state.perfectStreak >= 3);
        motion.pop(track);
      }
      if (previous && state.shields !== previous.shields)
        motion.pop(find(element, ".shield-meter"), true);
      previous = { ...state };
    },
    dispose: (): void => {
      motion.dispose();
    },
  };
};

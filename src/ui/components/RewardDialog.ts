import type { GameSnapshot, RewardId } from "@/contracts/game";
import { icon } from "@/ui/assets/icons";
import { rewardIllustration } from "@/ui/assets/rewardIllustrations";
import { REWARD_LABELS } from "@/ui/rewards/catalog";
import { REWARD_PRESENTATION, rewardUpgrade } from "@/ui/rewards/presentation";
import { dots, find, setText } from "./primitives";
import type { View } from "./primitives";
export const createRewardDialog = (
  choose: (id: RewardId) => void
): View<GameSnapshot> => {
  const element = document.createElement("section");
  element.className = "reward-panel";
  element.hidden = true;
  element.dataset.gameControl = "";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-labelledby", "reward-title");
  element.innerHTML = `<div class="reward-panel__content"><span class="section-kicker">${icon("gift")} <span data-reward-layer></span></span><h2 id="reward-title">选择一项奖励</h2><p class="panel-subtitle">游戏已暂停，选择后继续。</p><div class="reward-cards"></div></div>`;
  const cards = find(element, ".reward-cards");
  let current: readonly RewardId[] = [];
  let contentKey = "";
  const onClick = (event: Event): void => {
    const id = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-reward]"
    )?.dataset.reward as RewardId | undefined;
    if (id && !element.hidden && current.includes(id)) choose(id);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Tab" || element.hidden) return;
    const buttons = Array.from(cards.querySelectorAll("button"));
    if (!buttons.length) return;
    event.preventDefault();
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[
      (i + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ]?.focus();
  };
  cards.addEventListener("click", onClick);
  element.addEventListener("keydown", onKey);
  return {
    element,
    update: (state): void => {
      const entering = element.hidden && state.phase === "reward";
      element.hidden = state.phase !== "reward";
      if (element.hidden) {
        current = [];
        return;
      }
      current = state.rewardChoices;
      setText(
        element,
        ".panel-subtitle",
        state.lastResult === "perfect"
          ? "完美！选择后继续。"
          : "游戏已暂停，选择后继续。"
      );
      setText(element, "[data-reward-layer]", `第 ${state.layers} 层`);
      const key = current
        .map((id) => `${id}:${state.rewards[id]}:${state.shields}`)
        .join("|");
      if (contentKey !== key) {
        contentKey = key;
        cards.innerHTML = current
          .map((id) => {
            const meta = REWARD_PRESENTATION[id];
            const content = REWARD_LABELS[id];
            return `<button type="button" class="reward-card" data-reward="${id}" data-tone="${meta.tone}"><span class="reward-card__category">${icon(meta.icon)} ${meta.category}</span><span class="reward-card__art">${rewardIllustration(id)}</span><strong>${content.title}</strong><span class="reward-card__headline">${meta.headline}</span><span class="reward-card__detail">${content.description}</span><span class="reward-card__upgrade">${meta.kind === "passive" ? dots(state.rewards[id] + 1, 3) : icon(meta.icon)}${rewardUpgrade(id, state)}</span><span class="reward-card__action">选择 ${icon("arrow")}</span></button>`;
          })
          .join("");
      }
      if (entering || !element.contains(document.activeElement))
        cards.querySelector("button")?.focus();
    },
    dispose: (): void => {
      cards.removeEventListener("click", onClick);
      element.removeEventListener("keydown", onKey);
    },
  };
};

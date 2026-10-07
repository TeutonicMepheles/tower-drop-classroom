import { STATE_EVENT } from "@/config/gameConfig";
import type { Difficulty, GameSnapshot } from "@/config/gameConfig";
import { REWARDS } from "@/config/rewards";
import type { RewardId } from "@/config/rewards";

import type { Page } from "@/types/pages";

import Button from "@/components/Button/Button";

import { TowerDrop } from "@/core/TowerDrop";

import "@/pages/TowerDropPage/TowerDropPage.css";

const TowerDropPage = (): Page => {
  const main = document.createElement("main") as Page;
  main.className = "tower-drop-page";

  main.innerHTML = `
    <canvas class="tower-drop__webgl" tabindex="-1"></canvas>

    <div class="tower-drop__container" id="mainContainer">
        <p class="tower-drop__score" data-game-score>0</p><p class="gameplay-status" aria-live="polite">Ready · Normal</p>
        <section class="reward-panel" role="dialog" aria-modal="true" aria-labelledby="reward-title" data-game-control hidden>
          <div class="reward-panel__content"><h2 id="reward-title">选择本局加成</h2><p>游戏已暂停。选择一个奖励后继续堆叠。</p><div class="reward-cards"></div></div>
        </section>

        <div class="tower-drop__menu">
            <div class="tower-drop__menu-wrapper">
                <h1 class="tower-drop__title">Tower Drop</h1>
                <h2 class="tower-drop__last-score">Last Score: 0</h2>
                <label data-game-control>Difficulty
                  <select aria-label="Difficulty"><option value="normal">Normal</option><option value="easy">Easy</option></select>
                </label>
                <p>点击堆叠；每成功 5 层选择一次加成。速度不会自动增加。</p>
            </div>
        </div>
    </div>
  `;

  const canvas = main.querySelector<HTMLCanvasElement>(".tower-drop__webgl");
  const towerDropMenuWrapper = main.querySelector<HTMLDivElement>(
    ".tower-drop__menu-wrapper"
  );

  const playButton = Button({
    id: "playbtn",
    ariaLabel: "Start game",
    className: "tower-drop__button",
    children: "隆Play!",
  });

  towerDropMenuWrapper?.append(playButton);

  const game = new TowerDrop(canvas!, main);

  const select = main.querySelector<HTMLSelectElement>("select")!;
  const status = main.querySelector<HTMLElement>(".gameplay-status")!;
  const rewardPanel = main.querySelector<HTMLElement>(".reward-panel")!;
  const cards = main.querySelector<HTMLElement>(".reward-cards")!;
  const onDifficulty = (): void => {
    game.setDifficulty(select.value as Difficulty);
    playButton.textContent = `Play · ${select.value === "easy" ? "Easy" : "Normal"}`;
  };
  const onState = (event: Event): void => {
    const state = (event as CustomEvent<GameSnapshot>).detail;
    select.disabled = state.phase === "playing" || state.phase === "reward";
    status.textContent = `${state.phase} · ${state.difficulty} · ${state.layers} layers · streak ${state.perfectStreak}${state.lastResult === "perfect" ? " · PERFECT!" : ""} · 下次奖励 ${state.layersUntilReward} 层 · 减速 ${state.rewards.slow}/3 · 精准 ${state.rewards.precision}/3`;
    const wasReward = !rewardPanel.hidden;
    rewardPanel.hidden = state.phase !== "reward";
    if (state.phase === "reward") {
      cards.replaceChildren(
        ...state.rewardChoices.map((id) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.reward = id;
          const title = document.createElement("strong");
          title.textContent = REWARDS[id].title;
          const description = document.createElement("span");
          description.textContent = REWARDS[id].description;
          button.append(title, description);
          return button;
        })
      );
      cards.querySelector("button")?.focus();
    } else if (wasReward) canvas?.focus();
  };
  const onReward = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-reward]"
    );
    if (button) game.chooseReward(button.dataset.reward as RewardId);
  };
  const onRewardKey = (event: KeyboardEvent): void => {
    if (event.key !== "Tab" || rewardPanel.hidden) return;
    const buttons = Array.from(cards.querySelectorAll("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();
    buttons[
      (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ]?.focus();
  };
  cards.addEventListener("click", onReward);
  rewardPanel.addEventListener("keydown", onRewardKey);
  select.addEventListener("change", onDifficulty);
  main.addEventListener(STATE_EVENT, onState);
  main.cleanup = (): void => {
    select.removeEventListener("change", onDifficulty);
    main.removeEventListener(STATE_EVENT, onState);
    cards.removeEventListener("click", onReward);
    rewardPanel.removeEventListener("keydown", onRewardKey);
    game.dispose();

    playButton.cleanup?.();
  };

  return main;
};

export default TowerDropPage;

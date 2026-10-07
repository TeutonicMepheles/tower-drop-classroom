import { STATE_EVENT } from "@/config/gameConfig";
import type { Difficulty, GameSnapshot } from "@/config/gameConfig";

import type { Page } from "@/types/pages";

import Button from "@/components/Button/Button";

import { TowerDrop } from "@/core/TowerDrop";

import "@/pages/TowerDropPage/TowerDropPage.css";

const TowerDropPage = (): Page => {
  const main = document.createElement("main") as Page;
  main.className = "tower-drop-page";

  main.innerHTML = `
    <canvas class="tower-drop__webgl"></canvas>

    <div class="tower-drop__container" id="mainContainer">
        <p class="tower-drop__score" data-game-score>0</p><p class="gameplay-status" aria-live="polite">Ready · Normal</p>

        <div class="tower-drop__menu">
            <div class="tower-drop__menu-wrapper">
                <h1 class="tower-drop__title">Tower Drop</h1>
                <h2 class="tower-drop__last-score">Last Score: 0</h2>
                <label data-game-control>Difficulty
                  <select aria-label="Difficulty"><option value="normal">Normal</option><option value="easy">Easy</option></select>
                </label>
                <p>Click to stack. Perfect streaks earn 1–5 points per block.</p>
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
  const onDifficulty = (): void => {
    game.setDifficulty(select.value as Difficulty);
    playButton.textContent = `Play · ${select.value === "easy" ? "Easy" : "Normal"}`;
  };
  const onState = (event: Event): void => {
    const state = (event as CustomEvent<GameSnapshot>).detail;
    select.disabled = state.phase === "playing";
    status.textContent = `${state.phase} · ${state.difficulty} · ${state.layers} layers · streak ${state.perfectStreak}${state.lastResult === "perfect" ? " · PERFECT!" : ""}`;
  };
  select.addEventListener("change", onDifficulty);
  main.addEventListener(STATE_EVENT, onState);
  main.cleanup = (): void => {
    select.removeEventListener("change", onDifficulty);
    main.removeEventListener(STATE_EVENT, onState);
    game.dispose();

    playButton.cleanup?.();
  };

  return main;
};

export default TowerDropPage;

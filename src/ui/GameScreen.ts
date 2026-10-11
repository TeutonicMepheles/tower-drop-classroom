import type { Page } from "@/ui/types";
import type { GameCommands, GameSnapshot } from "@/contracts/game";
import { createHud } from "./components/Hud";
import { createRewardDialog } from "./components/RewardDialog";
import { createRunMenu } from "./components/RunMenu";
import { createFeedback } from "./components/Feedback";
import "./GameScreen.css";
/** Composition root for DOM UI. No gameplay state, scene objects or global input. */
export const createGameScreen = (
  game: GameCommands
): {
  element: Page;
  update: (state: Readonly<GameSnapshot>) => void;
  dispose: () => void;
} => {
  const main = document.createElement("main") as Page;
  main.className = "tower-drop-page";
  main.dataset.phase = "ready";
  main.innerHTML =
    '<canvas class="tower-drop__webgl" aria-label="三维堆塔游戏" tabindex="-1"></canvas><div class="tower-drop__container" id="mainContainer"></div>';
  const canvas = main.querySelector("canvas")!;
  const hud = createHud();
  const feedback = createFeedback();
  const menu = createRunMenu(
    () => {
      game.start();
    },
    (value) => {
      game.setDifficulty(value);
    }
  );
  const rewards = createRewardDialog((id) => {
    game.chooseReward(id);
  });
  const views = [hud, feedback, menu, rewards];
  main
    .querySelector(".tower-drop__container")!
    .append(...views.map((view) => view.element));
  let previous: GameSnapshot["phase"] | undefined;
  let disposed = false;
  const update = (state: Readonly<GameSnapshot>): void => {
    if (disposed) return;
    main.dataset.phase = state.phase;
    views.forEach((view) => {
      view.update(state);
    });
    if (
      (previous === "reward" || previous === "ready" || previous === "ended") &&
      state.phase === "playing"
    )
      canvas.focus();
    previous = state.phase;
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    views.forEach((view) => {
      view.dispose();
    });
  };
  main.cleanup = dispose;
  return { element: main, update, dispose };
};

import { createGameScreen } from "@/ui/GameScreen";
import { initial, fixtures } from "./fixtures";
import "@/ui/styles/global.css";
import "./uiLab.css";
// Visual fixtures only: no gameplay, records, audio or frame loop.
let state = { ...initial };
const screen = createGameScreen({
  start: () => {
    state = { ...fixtures.游戏中!, difficulty: state.difficulty };
    screen.update(state);
  },
  drop: () => {
    /* The fixture has no gameplay clock. */
  },
  setDifficulty: (difficulty) => {
    state = { ...state, difficulty };
    screen.update(state);
  },
  chooseReward: (id) => {
    state = {
      ...state,
      phase: "playing",
      rewardChoices: [],
      layersUntilReward: 5,
      shields: state.shields + (id === "shield" ? 1 : 0),
      rewards: { ...state.rewards, [id]: state.rewards[id] + 1 },
    };
    screen.update(state);
    return true;
  },
});
const toolbar = document.createElement("nav");
toolbar.className = "lab-controls ui-lab-controls";
toolbar.setAttribute("aria-label", "UI 状态预览");
toolbar.dataset.gameControl = "";
for (const [label, fixture] of Object.entries(fixtures)) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = (): void => {
    // Re-enter phases to reset presentation-only result caches between fixtures.
    screen.update(initial);
    state = {
      ...fixture,
      rewards: { ...fixture.rewards },
      difficulty: state.difficulty,
    };
    screen.update(state);
    toolbar.querySelectorAll("button").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  };
  toolbar.append(button);
}
document.querySelector("#app")!.append(screen.element, toolbar);
screen.update(state);
window.addEventListener("pagehide", screen.dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(screen.dispose);

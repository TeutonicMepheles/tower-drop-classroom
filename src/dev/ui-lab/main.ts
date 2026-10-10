import { createGameScreen } from "@/ui/GameScreen";
import type { GameSnapshot } from "@/contracts/game";
import "@/ui/styles/global.css";
import "./uiLab.css";
const initial: GameSnapshot = {
  difficulty: "normal",
  phase: "ready",
  score: 0,
  layers: 0,
  perfectStreak: 0,
  lastResult: "none",
  rewards: {
    repair: 0,
    slow: 0,
    precision: 0,
    shield: 0,
    perfectRepair: 0,
    steady: 0,
  },
  rewardChoices: [],
  layersUntilReward: 5,
  shields: 0,
  rescuesUsed: 0,
  perfectCount: 0,
  longestStreak: 0,
  bestLayers: 12,
  recordBroken: false,
};
let state = { ...initial };
const screen = createGameScreen({
  start: () => {
    show("playing");
  },
  drop: () => {
    /* This preview has no gameplay clock. */
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
      rewards: { ...state.rewards, [id]: state.rewards[id] + 1 },
    };
    screen.update(state);
    return true;
  },
});
function show(phase: GameSnapshot["phase"]): void {
  state = {
    ...initial,
    difficulty: state.difficulty,
    phase,
    score: phase === "ready" ? 0 : 15,
    layers: phase === "ready" ? 0 : 5,
    perfectStreak: 5,
    perfectCount: 5,
    longestStreak: 5,
    lastResult: phase === "ended" ? "miss" : "perfect",
    rewardChoices: phase === "reward" ? ["repair", "slow", "shield"] : [],
  };
  screen.update(state);
}
const toolbar = document.createElement("nav");
toolbar.className = "lab-controls";
toolbar.setAttribute("aria-label", "UI 状态预览");
for (const [phase, label] of [
  ["ready", "准备"],
  ["playing", "游戏中"],
  ["reward", "奖励"],
  ["ended", "结算"],
] as const) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = (): void => {
    show(phase);
  };
  toolbar.append(button);
}
document.querySelector("#app")!.append(screen.element, toolbar);
screen.update(state);
window.addEventListener("pagehide", screen.dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(screen.dispose);

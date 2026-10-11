import { createGameScreen } from "@/ui/GameScreen";
import { emptyRewards } from "@/gameplay/rewards";
import type { GameSnapshot } from "@/contracts/game";
const state: GameSnapshot = {
  difficulty: "normal",
  phase: "ready",
  score: 0,
  layers: 0,
  perfectStreak: 0,
  lastResult: "none",
  rewards: emptyRewards(),
  rewardChoices: [],
  layersUntilReward: 5,
  shields: 0,
  rescuesUsed: 0,
  perfectCount: 0,
  longestStreak: 0,
  bestLayers: 0,
  recordBroken: false,
};
it("renders snapshots without creating a game and emits commands without changing state", () => {
  const commands = {
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
  };
  const screen = createGameScreen(commands);
  document.body.append(screen.element);
  screen.update(state);
  screen.element.querySelector<HTMLButtonElement>("#playbtn")!.click();
  expect(commands.start).toHaveBeenCalledTimes(1);
  expect(screen.element.dataset.phase).toBe("ready");
  screen.update({ ...state, phase: "playing", score: 7 });
  expect(screen.element.querySelector("[data-game-score]")).toHaveTextContent(
    "7"
  );
  expect(
    screen.element.querySelector<HTMLElement>(".tower-drop__menu")!.style
      .display
  ).toBe("none");
  screen.update({ ...state, phase: "ended", score: 7 });
  expect(
    screen.element.querySelector(".tower-drop__last-score")
  ).toHaveTextContent("本局得分：7");
  expect(
    screen.element.querySelector<HTMLElement>(".tower-drop__menu")!.style
      .display
  ).toBe("flex");
  screen.dispose();
  screen.element.remove();
});

it("keeps reward focus inside the dialog and removes handlers on disposal", () => {
  const commands = {
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
  };
  const screen = createGameScreen(commands);
  document.body.append(screen.element);
  screen.update({
    ...state,
    difficulty: "easy",
    phase: "reward",
    rewardChoices: ["repair", "slow", "shield"],
  });
  const buttons = screen.element.querySelectorAll<HTMLButtonElement>(
    ".reward-cards button"
  );
  expect(document.activeElement).toBe(buttons[0]);
  buttons[0]!.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
  );
  expect(document.activeElement).toBe(buttons[2]);
  expect(
    screen.element.querySelector<HTMLInputElement>('input[value="easy"]')!
      .checked
  ).toBe(true);
  screen.dispose();
  buttons[0]!.click();
  expect(commands.chooseReward).not.toHaveBeenCalled();
  screen.element.remove();
});

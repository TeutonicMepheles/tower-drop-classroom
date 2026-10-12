import { createGameScreen } from "@/ui/GameScreen";
import { emptyRewards } from "@/gameplay/rewards";
import type { GameSnapshot } from "@/contracts/game";
import { createFeedback } from "@/ui/components/Feedback";
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

it("separates remaining shields, passive levels and historical instant purchases", () => {
  const screen = createGameScreen({
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
  });
  screen.update({
    ...state,
    phase: "playing",
    layers: 8,
    layersUntilReward: 2,
    shields: 1,
    rewards: { ...state.rewards, shield: 3, repair: 4, slow: 2 },
  });
  expect(screen.element.querySelector(".shield-meter")).toHaveAttribute(
    "aria-label",
    "剩余护盾 1 / 2"
  );
  expect(
    screen.element.querySelectorAll(".shield-slot.is-filled")
  ).toHaveLength(1);
  expect(screen.element.querySelectorAll(".bonus-chip")).toHaveLength(1);
  expect(screen.element.querySelector(".bonus-chip")).toHaveAttribute(
    "aria-label",
    "移动减速 2/3"
  );
  expect(screen.element.querySelector(".reward-track")).toHaveAttribute(
    "aria-valuenow",
    "3"
  );
  expect(
    screen.element.querySelectorAll(".reward-track__steps .is-filled")
  ).toHaveLength(3);
  screen.update({ ...state, phase: "playing" });
  expect(screen.element.querySelector(".run-bonuses")).toBeEmptyDOMElement();
  screen.dispose();
});

it("preserves reward focus and card identity on repeated snapshots, including one choice", () => {
  const commands = {
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
  };
  const screen = createGameScreen(commands);
  document.body.append(screen.element);
  const reward: GameSnapshot = {
    ...state,
    phase: "reward",
    rewardChoices: ["slow", "shield"],
  };
  screen.update(reward);
  const second = screen.element.querySelector<HTMLButtonElement>(
    '[data-reward="shield"]'
  )!;
  second.focus();
  screen.update({ ...reward });
  expect(document.activeElement).toBe(second);
  screen.update({ ...reward, rewardChoices: ["shield"] });
  const only = screen.element.querySelector<HTMLButtonElement>(
    '[data-reward="shield"]'
  )!;
  only.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
  );
  expect(document.activeElement).toBe(only);
  only.click();
  expect(commands.chooseReward).toHaveBeenCalledWith("shield");
  screen.update({ ...state, phase: "playing" });
  expect(document.activeElement).toBe(screen.element.querySelector("canvas"));
  screen.dispose();
  screen.element.remove();
});

it("keeps the completed run's difficulty while changing the next run's difficulty", () => {
  const screen = createGameScreen({
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
  });
  const ended: GameSnapshot = {
    ...state,
    phase: "ended",
    layers: 12,
    bestLayers: 12,
    recordBroken: true,
  };
  screen.update(ended);
  screen.update({ ...ended, difficulty: "easy", bestLayers: 4 });
  expect(screen.element.querySelector(".result-record")).toHaveTextContent(
    "普通最佳 12 层"
  );
  expect(
    screen.element.querySelector<HTMLInputElement>('input[value="easy"]')!
      .checked
  ).toBe(true);
  screen.update({ ...state, phase: "playing", difficulty: "easy" });
  screen.update({
    ...ended,
    difficulty: "easy",
    layers: 2,
    bestLayers: 4,
    recordBroken: false,
  });
  expect(screen.element.querySelector(".result-record")).toHaveTextContent(
    "简单最佳 4 层"
  );
  screen.dispose();
});

it("does not replay feedback for the same snapshot and releases its timer", () => {
  jest.useFakeTimers();
  const feedback = createFeedback();
  document.body.append(feedback.element);
  feedback.update({ ...state, phase: "playing" });
  const landed: GameSnapshot = {
    ...state,
    phase: "playing",
    layers: 1,
    score: 1,
    lastResult: "perfect",
  };
  feedback.update(landed);
  expect(feedback.element).toHaveTextContent("完美拼接+1");
  jest.advanceTimersByTime(700);
  feedback.update({ ...landed });
  jest.advanceTimersByTime(300);
  expect(feedback.element.querySelector(".feedback-toast")).not.toBeVisible();
  feedback.update({ ...landed, rescuesUsed: 1, lastResult: "rescue" });
  expect(feedback.element).toHaveTextContent("护盾生效");
  feedback.dispose();
  expect(jest.getTimerCount()).toBe(0);
  feedback.element.remove();
  jest.useRealTimers();
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

import { createGameScreen } from "@/ui/GameScreen";
import { emptyRewards } from "@/gameplay/rewards";
import type { GameSnapshot } from "@/contracts/game";
const state: GameSnapshot = {
  speedMultiplier: 1,
  skills: {
    magnetCharges: 1,
    repairCharges: 1,
    freezeCharges: 1,
    freezeRemainingMs: 0,
    canUseRepair: false,
    canUseFreeze: false,
    menuOpen: false,
    remainingMs: 2000,
    usedThisLayer: false,
    canUseMagnet: false,
  },
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
    openSkillMenu: jest.fn(() => true),
    closeSkillMenu: jest.fn(),
    useMagnet: jest.fn(() => true),
    useSkill: jest.fn(() => true),
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
    openSkillMenu: jest.fn(() => true),
    closeSkillMenu: jest.fn(),
    useMagnet: jest.fn(() => true),
    useSkill: jest.fn(() => true),
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
    rewardChoices: ["repair", "precision", "shield"],
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

it("renders live skill availability, countdown and commands without disturbing gameplay feedback", () => {
  const commands = {
    start: jest.fn(),
    drop: jest.fn(),
    setDifficulty: jest.fn(),
    chooseReward: jest.fn(() => true),
    openSkillMenu: jest.fn(() => true),
    closeSkillMenu: jest.fn(),
    useMagnet: jest.fn(() => true),
    useSkill: jest.fn(() => true),
  };
  const screen = createGameScreen(commands);
  document.body.append(screen.element);
  screen.update({ ...state, phase: "playing" });
  const trigger =
    screen.element.querySelector<HTMLButtonElement>(".skill-trigger")!;
  trigger.click();
  expect(commands.openSkillMenu).toHaveBeenCalledTimes(1);
  const opened = {
    ...state,
    phase: "playing" as const,
    skills: { ...state.skills, menuOpen: true, remainingMs: 1500 },
  };
  screen.update(opened);
  const menu = screen.element.querySelector<HTMLElement>(".skill-menu")!;
  const card = screen.element.querySelector<HTMLButtonElement>(".skill-card")!;
  expect(menu).toBeVisible();
  expect(card).toBeDisabled();
  screen.update({
    ...opened,
    skills: { ...opened.skills, canUseMagnet: true, remainingMs: 1200 },
  });
  expect(card).toBeEnabled();
  expect(menu).toHaveTextContent("1.2 秒");
  card.click();
  expect(commands.useSkill).toHaveBeenCalledTimes(1);
  expect(commands.drop).not.toHaveBeenCalled();
  menu.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  expect(commands.closeSkillMenu).toHaveBeenCalledTimes(1);
  screen.update({
    ...state,
    phase: "playing",
    skills: {
      ...state.skills,
      magnetCharges: 0,
      repairCharges: 0,
      freezeCharges: 0,
    },
  });
  expect(menu).not.toBeVisible();
  expect(trigger).toBeDisabled();
  expect(trigger).toHaveTextContent("已用完");
  screen.dispose();
  screen.element.remove();
});

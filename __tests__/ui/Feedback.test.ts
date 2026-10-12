import { feedbackMessage } from "@/ui/feedbackModel";
import { createMotion } from "@/ui/motion";
import { initial } from "@/dev/ui-lab/fixtures";
import type { GameSnapshot } from "@/contracts/game";

it("celebrates the first record crossing once and keeps subsequent streak feedback", () => {
  const before: GameSnapshot = {
    ...initial,
    phase: "playing",
    layers: 24,
    score: 60,
    perfectStreak: 5,
  };
  const after: GameSnapshot = {
    ...before,
    layers: 25,
    score: 65,
    perfectStreak: 6,
    lastResult: "perfect",
    bestLayers: 25,
    recordBroken: true,
  };
  expect(feedbackMessage(before, after)).toMatchObject({
    kind: "record",
    detail: "25 层 · +5",
  });
  expect(feedbackMessage(after, after)).toBeUndefined();
  expect(
    feedbackMessage(after, {
      ...after,
      layers: 26,
      score: 70,
      perfectStreak: 7,
    })
  ).toMatchObject({ kind: "streak", title: "7 连击！", detail: "+5" });
  expect(
    feedbackMessage(before, { ...after, phase: "reward" })
  ).toBeUndefined();
});

it("names the reward actually obtained, and does not treat starting a run as a landing", () => {
  expect(
    feedbackMessage(
      { ...initial, phase: "reward" },
      {
        ...initial,
        phase: "playing",
        rewards: { ...initial.rewards, precision: 1 },
      }
    )
  ).toMatchObject({ kind: "reward", title: "已获得：精准辅助" });
  expect(
    feedbackMessage(initial, { ...initial, phase: "playing", layers: 9 })
  ).toBeUndefined();
});

it("cancels interrupted animations, cleans up on disposal, and honors reduced motion", () => {
  const target = document.createElement("div");
  const cancel = jest.fn();
  const animate = jest.fn(() => ({ cancel, onfinish: null }));
  Object.defineProperty(target, "animate", { value: animate });
  const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: jest.fn(() => ({ matches: false })),
  });
  const motion = createMotion();
  try {
    motion.pop(target);
    motion.pop(target, true);
    expect(cancel).toHaveBeenCalledTimes(1);
    motion.dispose();
    expect(cancel).toHaveBeenCalledTimes(2);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn(() => ({ matches: true })),
    });
    motion.pop(target);
    expect(animate).toHaveBeenCalledTimes(2);
  } finally {
    motion.dispose();
    if (original) Object.defineProperty(window, "matchMedia", original);
    else Reflect.deleteProperty(window, "matchMedia");
  }
});

/** @jest-environment node */
import { GameSession } from "@/gameplay/GameSession";
import { measureLanding } from "@/gameplay/stacking";

const land = (game: GameSession, offset = 0): void => {
  const [bottom, top] = game.getBlocks().slice(-2);
  game.advance(
    (bottom!.position[top!.direction] +
      offset -
      top!.position[top!.direction]) /
      game.speed
  );
  game.drop();
};
const reward = (game: GameSession): void => {
  for (let i = 0; i < 5; i++) land(game);
};
describe("pure gameplay", () => {
  it("starts with isolated data and locks difficulty through rewards", () => {
    const game = new GameSession();
    game.setDifficulty("easy");
    game.start();
    game.setDifficulty("normal");
    expect(game.getSnapshot().difficulty).toBe("easy");
    const blocks = game.getBlocks();
    blocks[0]!.position.x = 999;
    expect(game.getBlocks()[0]!.position.x).toBe(0);
    const copy = game.getSnapshot();
    copy.rewards.slow = 999;
    expect(game.getSnapshot().rewards.slow).toBe(0);
    const ids = game.getBlocks().map((b) => b.id);
    game.start();
    expect(game.getBlocks().map((b) => b.id)).toEqual(ids);
  });
  it("handles both axes, capped streak scoring, pause and exact reward acceptance", () => {
    const game = new GameSession(undefined, () => 0);
    game.start();
    reward(game);
    expect(game.getSnapshot()).toMatchObject({
      score: 15,
      layers: 5,
      perfectCount: 5,
      phase: "reward",
    });
    expect(game.getSnapshot().rewardChoices).toEqual([
      "slow",
      "precision",
      "shield",
    ]);
    const before = game.getBlocks();
    game.advance(1);
    game.drop();
    expect(game.getBlocks()).toEqual(before);
    expect(game.chooseReward("repair")).toBe(false);
    expect(game.chooseReward("slow")).toBe(true);
    expect(game.chooseReward("slow")).toBe(false);
    expect(game.speed).toBeCloseTo(0.039 * 0.92);
  });
  it("cuts correct dimensions and emits positive fragments without leaking live blocks", () => {
    const game = new GameSession();
    game.start();
    land(game, 0.5);
    expect(game.getBlocks().at(-2)).toMatchObject({
      position: { x: 0.25 },
      sizes: { width: 2.5, depth: 3 },
    });
    const events = game.drainEvents();
    const fragment = events.find((e) => e.type === "fragment");
    expect(fragment).toMatchObject({
      block: { sizes: { width: 0.5, depth: 3 }, position: { x: 1.75 } },
    });
    const landed = events.find((e) => e.type === "landed");
    if (landed?.type === "landed") landed.block.sizes.width = 999;
    land(game, -0.5);
    expect(game.getBlocks().at(-2)!.sizes).toEqual({
      width: 2.5,
      height: 1,
      depth: 2.5,
    });
  });
  it("repairs the tower and moving block, never exceeding initial dimensions", () => {
    const game = new GameSession(undefined, () => 0);
    game.start();
    land(game, 0.5);
    for (let i = 0; i < 4; i++) land(game);
    expect(game.chooseReward("repair")).toBe(true);
    expect(
      game
        .getBlocks()
        .slice(-2)
        .map((b) => b.sizes.width)
    ).toEqual([2.8, 2.8]);
    reward(game);
    game.chooseReward("repair");
    expect(game.getBlocks().at(-1)!.sizes.width).toBe(3);
  });
  it("rescues once and preserves per-difficulty records across restart", () => {
    const game = new GameSession(undefined, () => 0.999);
    game.start();
    reward(game);
    game.chooseReward("shield");
    land(game, 4);
    expect(game.getSnapshot()).toMatchObject({
      phase: "playing",
      layers: 5,
      shields: 0,
      rescuesUsed: 1,
      lastResult: "rescue",
    });
    expect(game.getBlocks().at(-1)!.position.z).toBe(-10);
    land(game, 4);
    expect(game.getSnapshot().phase).toBe("ended");
    game.setDifficulty("easy");
    expect(game.getSnapshot().bestLayers).toBe(0);
    game.setDifficulty("normal");
    game.start();
    expect(game.getSnapshot()).toMatchObject({
      bestLayers: 5,
      layers: 0,
      score: 0,
      shields: 0,
      rescuesUsed: 0,
    });
  });
  it("applies perfect repair and steady recovery", () => {
    const game = new GameSession(undefined, () => 0.999);
    game.start();
    land(game, 0.5);
    for (let i = 0; i < 4; i++) land(game);
    game.chooseReward("perfectRepair");
    land(game);
    expect(game.getBlocks().at(-1)!.sizes.width).toBeCloseTo(2.53);
    for (let i = 0; i < 4; i++) land(game);
    game.chooseReward("steady");
    land(game, 0.5);
    expect(game.getBlocks().at(-1)!.sizes.width).toBeCloseTo(2.225);
  });
  it("continues 150 layers without increasing speed or exceeding reward caps", () => {
    const game = new GameSession(undefined, () => 0);
    game.start();
    for (let i = 0; i < 150; i++) {
      land(game);
      if (game.getSnapshot().phase === "reward")
        game.chooseReward(game.getSnapshot().rewardChoices[0]!);
    }
    expect(game.getSnapshot()).toMatchObject({
      layers: 150,
      phase: "playing",
      rewards: { slow: 3, precision: 3, perfectRepair: 3, steady: 3 },
      shields: 2,
    });
    expect(game.speed).toBeCloseTo(0.039 * 0.92 ** 3);
  });
  it("uses the same elapsed movement at 60 and 120 Hz", () => {
    const a = new GameSession(),
      b = new GameSession();
    a.start();
    b.start();
    a.advance(1);
    b.advance(0.5);
    b.advance(0.5);
    expect(a.getBlocks().at(-1)!.position.x).toBeCloseTo(
      b.getBlocks().at(-1)!.position.x
    );
  });
  it("treats exact zero overlap as a miss and tolerance inclusively", () => {
    const game = new GameSession();
    const [bottom, top] = game.getBlocks();
    top!.position.x = 3;
    expect(measureLanding(top!, bottom!, 0.1)).toMatchObject({
      overlap: 0,
      perfect: false,
    });
    top!.position.x = 0.1;
    expect(measureLanding(top!, bottom!, 0.1)).toMatchObject({
      delta: 0,
      perfect: true,
    });
  });
});

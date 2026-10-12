import { GameController } from "@/runtime/GameController";
import { GameSession } from "@/gameplay/GameSession";
import type { ScenePort, PhysicsPort } from "@/contracts/ports";
const setup = (): {
  game: GameController;
  model: GameSession;
  scene: jest.Mocked<ScenePort>;
  physics: jest.Mocked<PhysicsPort>;
  driver: { setAnimationLoop: jest.Mock };
  save: jest.Mock;
  publish: jest.Mock;
} => {
  const scene = {
    hitTestMovingBlock: jest.fn((_x: number, _y: number) => true),
    sync: jest.fn(),
    feedback: jest.fn(),
    follow: jest.fn(),
    cameraHeight: 4,
    render: jest.fn(),
    resize: jest.fn(),
    reset: jest.fn(),
    dispose: jest.fn(),
  };
  const physics = {
    sync: jest.fn(),
    addFragment: jest.fn(),
    step: jest.fn(),
    getFragments: jest.fn(() => []),
    reset: jest.fn(),
    dispose: jest.fn(),
  };
  const model = new GameSession(undefined, () => 0),
    driver = { setAnimationLoop: jest.fn() },
    save = jest.fn(),
    publish = jest.fn();
  const game = new GameController(
    model,
    scene,
    physics,
    driver,
    {
      load: (): { easy: number; normal: number } => ({ easy: 0, normal: 0 }),
      save,
    },
    publish
  );
  return { game, model, scene, physics, driver, save, publish };
};
const align = (model: GameSession, offset = 0): void => {
  const top = model.getBlocks().at(-1)!,
    bottom = model.getBlocks().at(-2)!;
  model.advance(
    (bottom.position[top.direction] + offset - top.position[top.direction]) /
      model.speed
  );
};
it("coordinates cuts, persistence, reward pause and resumes a single loop", () => {
  const { game, model, scene, physics, driver, save, publish } = setup();
  game.start();
  align(model, 0.5);
  game.drop();
  expect(physics.addFragment).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenLastCalledWith({ easy: 0, normal: 1 });
  expect(scene.feedback).toHaveBeenLastCalledWith(
    expect.arrayContaining([expect.objectContaining({ type: "landed" })]),
    "playing"
  );
  for (let i = 0; i < 4; i++) {
    align(model);
    game.drop();
  }
  expect(game.getSnapshot().phase).toBe("reward");
  expect(driver.setAnimationLoop).toHaveBeenLastCalledWith(null);
  const before = publish.mock.calls.length;
  game.drop();
  expect(publish).toHaveBeenCalledTimes(before);
  expect(game.chooseReward("repair")).toBe(true);
  expect(driver.setAnimationLoop).toHaveBeenLastCalledWith(
    expect.any(Function)
  );
  expect(game.chooseReward("repair")).toBe(false);
  game.dispose();
});
it("orders frame updates and makes stale callbacks inert after disposal", () => {
  const { game, model, scene, physics, driver } = setup();
  jest.spyOn(performance, "now").mockReturnValue(1000);
  game.start();
  const frame = driver.setAnimationLoop.mock.calls.at(-1)![0] as (
    time: number
  ) => void;
  const initial = model.getBlocks().at(-1)!.position.x;
  frame(1000 + 1000 / 120);
  expect(model.getBlocks().at(-1)!.position.x - initial).toBeCloseTo(
    model.speed / 2
  );
  expect(physics.step).toHaveBeenCalledWith(-16, expect.closeTo(0.5));
  const calls = scene.render.mock.calls.length;
  game.dispose();
  game.dispose();
  frame(2000);
  game.start();
  game.drop();
  expect(scene.render).toHaveBeenCalledTimes(calls);
  expect(scene.dispose).toHaveBeenCalledTimes(1);
  expect(physics.dispose).toHaveBeenCalledTimes(1);
});
it("does not restart active games and reinitializes an ended round", () => {
  const { game, model, scene } = setup();
  game.start();
  const ids = model.getBlocks().map((b) => b.id);
  game.start();
  expect(model.getBlocks().map((b) => b.id)).toEqual(ids);
  game.drop();
  expect(game.getSnapshot().phase).toBe("ended");
  game.start();
  expect(scene.reset).toHaveBeenCalledTimes(2);
  expect(game.getSnapshot()).toMatchObject({ phase: "playing", score: 0 });
  game.dispose();
});

it("keeps one loop during bullet time, uses real elapsed time and persists skill landings", () => {
  const { game, model, driver, physics, save, publish } = setup();
  jest.spyOn(performance, "now").mockReturnValue(1000);
  game.start();
  align(model, 0.5);
  const frame = driver.setAnimationLoop.mock.calls.at(-1)![0] as (
    time: number
  ) => void;
  game.openSkillMenu();
  expect(driver.setAnimationLoop).toHaveBeenCalledTimes(2); // stop before start, then one loop
  frame(1016.6666667);
  expect(physics.step).toHaveBeenLastCalledWith(-16, expect.closeTo(0.2));
  expect(publish.mock.calls.at(-1)![0].skills.remainingMs).toBeCloseTo(
    1983.3333333
  );
  expect(game.useMagnet()).toBe(true);
  expect(save).toHaveBeenLastCalledWith({ easy: 0, normal: 1 });
  expect(game.getSnapshot().layers).toBe(1);
  game.dispose();
  expect(game.openSkillMenu()).toBe(false);
  expect(game.useMagnet()).toBe(false);
});

it("publishes freeze countdown and timeout without adding a layer", () => {
  const { game, model, driver, publish } = setup();
  jest.spyOn(performance, "now").mockReturnValue(1000);
  game.start();
  align(model);
  game.openSkillMenu();
  expect(game.useSkill("freeze")).toBe(true);
  const frame = driver.setAnimationLoop.mock.calls.at(-1)![0] as (
    time: number
  ) => void;
  frame(1500);
  expect(publish.mock.calls.at(-1)![0].skills.freezeRemainingMs).toBe(500);
  frame(2000);
  expect(publish.mock.calls.at(-1)![0].skills.freezeRemainingMs).toBe(0);
  expect(game.getSnapshot().layers).toBe(0);
  game.drop();
  expect(game.getSnapshot().layers).toBe(1);
  game.dispose();
});

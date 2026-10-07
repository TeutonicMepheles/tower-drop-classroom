import * as THREE from "three";
import * as CANNON from "cannon";
import { TowerDrop } from "@/core/TowerDrop";
import type { Page } from "@/types/pages";
import { GAME_CONFIG, STATE_EVENT } from "@/config/gameConfig";

describe("classroom gameplay contract", () => {
  let page: Page;
  let game: TowerDrop;
  beforeEach(() => {
    jest.clearAllMocks();
    page = document.createElement("main");
    page.innerHTML =
      '<canvas></canvas><p class="tower-drop__score">0</p><div class="tower-drop__menu"><h2 class="tower-drop__last-score"></h2><button id="playbtn" class="tower-drop__button">Play</button><select><option>easy</option></select></div>';
    document.body.append(page);
    game = new TowerDrop(page.querySelector("canvas")!, page);
  });
  afterEach(() => {
    game.dispose();
    page.remove();
  });
  const click = (): boolean => window.dispatchEvent(new MouseEvent("click"));
  const start = (): void => {
    page.querySelector<HTMLButtonElement>("button")!.click();
  };
  const latestMesh = (): THREE.Mesh =>
    (THREE.Mesh as unknown as jest.Mock).mock.results.at(-1)!
      .value as THREE.Mesh;

  it("locks difficulty during a round and publishes isolated snapshots", () => {
    const listener = jest.fn();
    page.addEventListener(STATE_EVENT, listener);
    game.setDifficulty("easy");
    start();
    game.setDifficulty("normal");
    expect(game.getSnapshot().difficulty).toBe("easy");
    expect(GAME_CONFIG.easy.speed).toBeLessThan(GAME_CONFIG.normal.speed);
    const copy = game.getSnapshot();
    Object.assign(copy, { score: 999 });
    expect(game.getSnapshot().score).toBe(0);
    expect(listener).toHaveBeenCalled();
  });
  it("snaps both axes, rewards streaks and creates no zero-size fragments", () => {
    start();
    const x = latestMesh();
    x.position.x = 0.08;
    click();
    expect(x.position.x).toBe(0);
    expect(game.getSnapshot()).toMatchObject({
      score: 1,
      layers: 1,
      perfectStreak: 1,
    });
    const z = latestMesh();
    z.position.z = 0.08;
    click();
    expect(z.position.z).toBe(0);
    expect(game.getSnapshot()).toMatchObject({
      score: 3,
      layers: 2,
      perfectStreak: 2,
    });
    expect(THREE.Mesh).toHaveBeenCalledTimes(6);
  });
  it("ordinary cuts reset streaks and retain positive fragments", () => {
    start();
    click();
    latestMesh().position.z = 0.5;
    click();
    expect(game.getSnapshot()).toMatchObject({
      score: 2,
      layers: 2,
      perfectStreak: 0,
      lastResult: "normal",
    });
  });
  it("zero overlap ends the round; restarting resets score and streak", () => {
    start();
    click();
    latestMesh().position.z = 3;
    click();
    expect(game.getSnapshot()).toMatchObject({
      phase: "ended",
      score: 1,
      lastResult: "miss",
    });
    start();
    expect(game.getSnapshot()).toMatchObject({
      phase: "playing",
      score: 0,
      layers: 0,
      perfectStreak: 0,
    });
  });
  it("UI controls do not drop a block", () => {
    start();
    page
      .querySelector("select")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(game.getSnapshot().layers).toBe(0);
  });

  const reachReward = (): void => {
    for (let i = 0; i < 5; i++) click();
    expect(game.getSnapshot().phase).toBe("reward");
  };
  it("keeps movement consistent across display refresh rates", () => {
    jest.spyOn(performance, "now").mockReturnValue(1000);
    start();
    const renderer = (
      THREE.WebGLRenderer as unknown as jest.Mock
    ).mock.results.at(-1)!.value as { setAnimationLoop: jest.Mock };
    const frame = renderer.setAnimationLoop.mock.calls.at(-1)![0] as (
      time: number
    ) => void;
    const moving = latestMesh();
    frame(1000 + 1000 / 120);
    expect(moving.position.x).toBeCloseTo(GAME_CONFIG.normal.speed / 2);
    frame(1000 + 1000 / 60);
    expect(moving.position.x).toBeCloseTo(GAME_CONFIG.normal.speed);
  });
  it("pauses every five layers and accepts exactly one offered reward", () => {
    start();
    expect(game.chooseReward("repair")).toBe(false);
    reachReward();
    expect(game.getSnapshot().rewardChoices).toEqual([
      "repair",
      "slow",
      "precision",
    ]);
    click();
    expect(game.getSnapshot().layers).toBe(5);
    game.setDifficulty("easy");
    expect(game.getSnapshot().difficulty).toBe("normal");
    expect(game.chooseReward("slow")).toBe(true);
    expect(game.chooseReward("repair")).toBe(false);
    expect(game.getSnapshot()).toMatchObject({
      phase: "playing",
      layersUntilReward: 5,
      rewards: { slow: 1 },
    });
    reachReward();
    expect(game.getSnapshot().layers).toBe(10);
  });
  it("repairs both axes, rebuilds geometry and collision shapes, and caps dimensions", () => {
    start();
    latestMesh().position.x = 0.5;
    reachReward();
    const moving = latestMesh();
    expect(game.chooseReward("repair")).toBe(true);
    expect(THREE.BoxGeometry).toHaveBeenLastCalledWith(2.8, 1, 3);
    expect(CANNON.Vec3).toHaveBeenLastCalledWith(1.4, 0.5, 1.5);
    expect(moving.scale).toEqual({ x: 1, y: 1, z: 1 });
    reachReward();
    game.chooseReward("repair");
    expect(THREE.BoxGeometry).toHaveBeenLastCalledWith(3, 1, 3);
  });
  it("applies speed reduction and enhanced precision to actual movement and landing", () => {
    start();
    reachReward();
    game.chooseReward("slow");
    const renderer = (
      THREE.WebGLRenderer as unknown as jest.Mock
    ).mock.results.at(-1)!.value as { setAnimationLoop: jest.Mock };
    const frame = renderer.setAnimationLoop.mock.calls.at(-1)![0] as () => void;
    const moving = latestMesh();
    frame();
    expect(moving.position.z).toBeCloseTo(GAME_CONFIG.normal.speed * 0.92);
    moving.position.z = 0;
    reachReward();
    game.chooseReward("precision");
    latestMesh().position.x = 0.115;
    click();
    expect(game.getSnapshot().lastResult).toBe("perfect");
  });
  it("filters capped rewards, isolates nested snapshots, and resets all bonuses on restart", () => {
    start();
    for (let i = 0; i < 3; i++) {
      reachReward();
      game.chooseReward("slow");
    }
    reachReward();
    expect(game.getSnapshot().rewardChoices).not.toContain("slow");
    const copy = game.getSnapshot();
    copy.rewards.slow = 999;
    copy.rewardChoices.length = 0;
    expect(game.getSnapshot().rewards.slow).toBe(3);
    expect(game.chooseReward("slow")).toBe(false);
    game.chooseReward("precision");
    latestMesh().position.x = latestMesh().position.z = 4;
    click();
    expect(game.getSnapshot().phase).toBe("ended");
    start();
    expect(game.getSnapshot()).toMatchObject({
      rewards: { repair: 0, slow: 0, precision: 0 },
      rewardChoices: [],
      layersUntilReward: 5,
    });
  });
});

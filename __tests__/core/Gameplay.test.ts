import * as THREE from "three";
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
});

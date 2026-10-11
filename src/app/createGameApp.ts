import { GameController } from "@/runtime/GameController";
import { GameSession } from "@/gameplay/GameSession";
import { TowerScene } from "@/presentation/TowerScene";
import { TowerPhysics } from "@/runtime/physics";
import { loadRecords, saveRecords } from "@/storage/records";
import { createGameScreen } from "@/ui/GameScreen";
import { bindInput } from "@/runtime/input";
import type { Page } from "@/ui/types";
export function createGameApp(session?: GameSession): Page {
  const screen = createGameScreen({
    start: () => {
      game.start();
    },
    drop: () => {
      game.drop();
    },
    setDifficulty: (difficulty) => {
      game.setDifficulty(difficulty);
    },
    chooseReward: (id) => game.chooseReward(id),
  });
  const page = screen.element;
  const scene = new TowerScene(page.querySelector("canvas")!, page);
  const store = { load: loadRecords, save: saveRecords };
  const game = new GameController(
    session ?? new GameSession(store.load()),
    scene,
    new TowerPhysics(),
    scene,
    store,
    screen.update
  );
  const resize = (): void => {
    scene.resize(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio
    );
  };
  const unbindInput = bindInput(() => {
    game.drop();
  });
  window.addEventListener("resize", resize);
  resize();
  screen.update(game.getSnapshot());
  let disposed = false;
  page.cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    unbindInput();
    window.removeEventListener("resize", resize);
    screen.dispose();
    game.dispose();
  };
  return page;
}

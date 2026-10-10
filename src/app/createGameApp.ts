import { TowerDrop } from "@/core/TowerDrop";
import { createGameScreen } from "@/ui/GameScreen";
import { bindInput } from "@/runtime/input";
import { STATE_EVENT } from "@/contracts/game";
import type { GameSnapshot } from "@/contracts/game";
import type { Page } from "@/types/pages";
export function createGameApp(): Page {
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
  const game = new TowerDrop(page.querySelector("canvas")!, page);
  const onState = (event: Event): void => {
    screen.update((event as CustomEvent<GameSnapshot>).detail);
  };
  page.addEventListener(STATE_EVENT, onState);
  const unbindInput = bindInput(() => {
    game.drop();
  });
  screen.update(game.getSnapshot());
  let disposed = false;
  page.cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    unbindInput();
    page.removeEventListener(STATE_EVENT, onState);
    screen.dispose();
    game.dispose();
  };
  return page;
}

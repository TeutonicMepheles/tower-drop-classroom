import { GameSession } from "@/gameplay/GameSession";
import { TowerDrop } from "@/core/TowerDrop";
import type { Block } from "@/types/app";
import type { Difficulty } from "@/contracts/game";

it.each(["easy", "normal"] as Difficulty[])(
  "matches the existing engine for %s commands",
  (difficulty) => {
    localStorage.clear();
    jest.spyOn(Math, "random").mockReturnValue(0.999);
    const host = document.createElement("main");
    const legacy = new TowerDrop(document.createElement("canvas"), host);
    const model = new GameSession(undefined, () => 0.999);
    legacy.setDifficulty(difficulty);
    model.setDifficulty(difficulty);
    legacy.start();
    model.start();
    const trace: string[] = [];
    try {
      for (let i = 0; i < 60; i++) {
        const blocks = model.getBlocks();
        const top = blocks.at(-1)!,
          bottom = blocks.at(-2)!;
        const offset = i % 17 === 16 ? 4 : i % 3 === 0 ? 0.3 : 0;
        model.advance(
          (bottom.position[top.direction] +
            offset -
            top.position[top.direction]) /
            model.speed
        );
        const old = (legacy as unknown as { gameState: { blocks: Block[] } })
          .gameState.blocks;
        const aligned = model.getBlocks();
        for (let j = 0; j < old.length; j++)
          Object.assign(old[j]!.mesh.position, aligned[j]!.position);
        legacy.drop();
        model.drop();
        expect(model.getSnapshot()).toEqual(legacy.getSnapshot());
        trace.push(
          JSON.stringify({
            state: legacy.getSnapshot(),
            sizes: (
              legacy as unknown as { gameState: { blocks: Block[] } }
            ).gameState.blocks.map((b) => b.sizes),
          })
        );
        expect(model.getBlocks().map((b) => b.sizes)).toEqual(
          old.map((b) => b.sizes)
        );
        if (model.getSnapshot().phase === "reward") {
          const choices = model.getSnapshot().rewardChoices;
          const choice = choices[i % choices.length]!;
          expect(model.chooseReward(choice)).toBe(legacy.chooseReward(choice));
        }
        if (model.getSnapshot().phase === "ended") {
          legacy.start();
          model.start();
        }
        expect(model.getSnapshot()).toEqual(legacy.getSnapshot());
      }
      expect(trace).toMatchSnapshot();
    } finally {
      legacy.dispose();
    }
  }
);

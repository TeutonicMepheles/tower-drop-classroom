/** @jest-environment node */
import { GameSession } from "@/gameplay/GameSession";
import type { Difficulty } from "@/contracts/game";
it.each(["easy", "normal"] as Difficulty[])(
  "preserves the reviewed gameplay command trace for %s",
  (difficulty) => {
    const model = new GameSession(undefined, () => 0.999);
    model.setDifficulty(difficulty);
    model.start();
    const trace: string[] = [];
    for (let i = 0; i < 60; i++) {
      const top = model.getBlocks().at(-1)!,
        bottom = model.getBlocks().at(-2)!;
      const offset = i % 17 === 16 ? 4 : i % 3 === 0 ? 0.3 : 0;
      model.advance(
        (bottom.position[top.direction] +
          offset -
          top.position[top.direction]) /
          model.speed
      );
      model.drop();
      trace.push(
        JSON.stringify({
          state: model.getSnapshot(),
          sizes: model.getBlocks().map((b) => ({
            height: b.sizes.height,
            width: b.sizes.width,
            depth: b.sizes.depth,
          })),
        })
      );
      if (model.getSnapshot().phase === "reward") {
        const choices = model.getSnapshot().rewardChoices;
        model.chooseReward(choices[i % choices.length]!);
      }
      if (model.getSnapshot().phase === "ended") model.start();
    }
    expect(trace).toMatchSnapshot();
  }
);

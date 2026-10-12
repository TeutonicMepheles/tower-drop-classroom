/** @jest-environment node */
import { GameSession } from "@/gameplay/GameSession";
const align = (game: GameSession, offset = 0): void => {
  const [bottom, top] = game.getBlocks().slice(-2);
  game.advance(
    (bottom!.position[top!.direction] +
      offset -
      top!.position[top!.direction]) /
      game.speed
  );
};
const start = (): GameSession => {
  const game = new GameSession();
  game.start();
  return game;
};
it("opens only during play and isolates skill snapshots", () => {
  const game = new GameSession();
  expect(game.openSkillMenu()).toBe(false);
  game.start();
  const copy = game.getSnapshot();
  copy.skills.magnetCharges = 100;
  expect(game.getSnapshot().skills.magnetCharges).toBe(1);
  expect(game.useMagnet()).toBe(false);
  expect(game.openSkillMenu()).toBe(true);
  expect(game.openSkillMenu()).toBe(false);
  game.start();
  expect(game.getSnapshot().skills.menuOpen).toBe(true);
  game.setDifficulty("easy");
  expect(game.getSnapshot().difficulty).toBe("normal");
});
it("slows movement to 20%, consumes real time and preserves the remaining budget on cancel", () => {
  const game = start();
  const initial = game.getBlocks().at(-1)!.position.x;
  game.openSkillMenu();
  game.advance(30, 500);
  expect(game.getBlocks().at(-1)!.position.x - initial).toBeCloseTo(
    game.speed * 30 * 0.2
  );
  expect(game.getSnapshot().skills.remainingMs).toBe(1500);
  game.closeSkillMenu();
  game.advance(30, 500);
  expect(game.getSnapshot().skills.remainingMs).toBe(1500);
  game.openSkillMenu();
  game.advance(90, 1500);
  expect(game.getSnapshot().skills).toMatchObject({
    menuOpen: false,
    remainingMs: 0,
    magnetCharges: 1,
  });
  expect(game.openSkillMenu()).toBe(false);
  expect(game.getSnapshot().layers).toBe(0);
});
it("expires on a delayed frame without dropping or consuming a skill", () => {
  const game = start();
  game.openSkillMenu();
  game.advance(3, 5000);
  expect(game.getSnapshot()).toMatchObject({
    layers: 0,
    skills: { menuOpen: false, remainingMs: 0, magnetCharges: 1 },
  });
});
it("blocks normal placement in the menu and rejects an out-of-range skill", () => {
  const game = start();
  game.openSkillMenu();
  game.drop();
  expect(game.useMagnet()).toBe(false);
  expect(game.getSnapshot()).toMatchObject({
    phase: "playing",
    layers: 0,
    skills: { menuOpen: true, magnetCharges: 1 },
  });
});
it.each([0, 1])(
  "magnet performs exactly one perfect placement on axis %s and can only be spent once",
  (axis) => {
    const game = start();
    if (axis) {
      align(game);
      game.drop();
    }
    align(game, 0.6);
    game.openSkillMenu();
    expect(game.getSnapshot().skills.canUseMagnet).toBe(true);
    expect(game.useMagnet()).toBe(true);
    expect(game.getSnapshot()).toMatchObject({
      layers: axis + 1,
      lastResult: "perfect",
      skills: { menuOpen: false, magnetCharges: 0 },
    });
    expect(game.useMagnet()).toBe(false);
    expect(game.openSkillMenu()).toBe(true);
  }
);
it("skill at layer five opens rewards, and restart restores one charge", () => {
  const game = start();
  for (let i = 0; i < 4; i++) {
    align(game);
    game.drop();
  }
  align(game, 0.5);
  game.openSkillMenu();
  game.useMagnet();
  expect(game.getSnapshot()).toMatchObject({
    phase: "reward",
    layers: 5,
    skills: { menuOpen: false, magnetCharges: 0 },
  });
  expect(game.openSkillMenu()).toBe(false);
  game.chooseReward(game.getSnapshot().rewardChoices[0]!);
  game.drop();
  game.start();
  expect(game.getSnapshot()).toMatchObject({
    phase: "playing",
    layers: 0,
    skills: { menuOpen: false, magnetCharges: 1, remainingMs: 2000 },
  });
});
it("newly placed layers replenish time but a shield retry does not", () => {
  const game = new GameSession(undefined, () => 0.999);
  game.start();
  for (let i = 0; i < 5; i++) {
    align(game);
    game.drop();
  }
  game.chooseReward("shield");
  game.openSkillMenu();
  game.advance(0, 700);
  game.closeSkillMenu();
  game.drop();
  expect(game.getSnapshot()).toMatchObject({
    lastResult: "rescue",
    skills: { remainingMs: 1300 },
  });
  align(game);
  game.drop();
  expect(game.getSnapshot().skills.remainingMs).toBe(2000);
});

it("emergency repair is unavailable at full size, restores both blocks and does not place", () => {
  const game = start();
  game.openSkillMenu();
  expect(game.useSkill("repair")).toBe(false);
  expect(game.getSnapshot().skills.repairCharges).toBe(1);
  game.closeSkillMenu();
  align(game, 0.8);
  game.drop();
  align(game, 0.5);
  game.drop();
  const before = game.getBlocks().slice(-2);
  game.openSkillMenu();
  expect(game.useSkill("repair")).toBe(true);
  expect(game.getSnapshot()).toMatchObject({
    layers: 2,
    skills: { repairCharges: 0, menuOpen: false, usedThisLayer: true },
  });
  game
    .getBlocks()
    .slice(-2)
    .forEach((block, index) => {
      expect(block.sizes.width).toBeCloseTo(2.8);
      expect(block.sizes.depth).toBe(3);
      expect(block.position).toEqual(before[index]!.position);
    });
  expect(game.openSkillMenu()).toBe(false);
  align(game);
  game.drop();
  expect(game.openSkillMenu()).toBe(true);
});
it("freeze holds position for one real second then resumes without automatic placement", () => {
  const game = start();
  align(game, 0.4);
  game.openSkillMenu();
  expect(game.useSkill("freeze")).toBe(true);
  const position = game.getBlocks().at(-1)!.position.x;
  game.advance(30, 500);
  expect(game.getBlocks().at(-1)!.position.x).toBe(position);
  expect(game.getSnapshot().skills.freezeRemainingMs).toBe(500);
  game.advance(45, 750);
  expect(game.getBlocks().at(-1)!.position.x - position).toBeCloseTo(
    game.speed * 15
  );
  expect(game.getSnapshot()).toMatchObject({
    layers: 0,
    skills: { freezeRemainingMs: 0, freezeCharges: 0 },
  });
  expect(game.openSkillMenu()).toBe(false);
});
it("manual drop during freeze places once and leaves the next block moving", () => {
  const game = start();
  align(game);
  game.openSkillMenu();
  game.useSkill("freeze");
  game.drop();
  expect(game.getSnapshot()).toMatchObject({
    layers: 1,
    lastResult: "perfect",
    skills: { freezeRemainingMs: 0, usedThisLayer: false },
  });
  const top = game.getBlocks().at(-1)!;
  game.advance(1);
  expect(game.getBlocks().at(-1)!.position.z - top.position.z).toBeCloseTo(
    game.speed
  );
});
it.each([
  [0, "magnetSupply", "magnetCharges"],
  [0.4, "repairSupply", "repairCharges"],
  [0.999, "freezeSupply", "freezeCharges"],
] as const)(
  "offers supply %s after five layers and replenishes exactly one charge",
  (random, id, key) => {
    const game = new GameSession(undefined, () => random);
    game.start();
    align(game);
    game.openSkillMenu();
    game.useMagnet();
    for (let i = 0; i < 4; i++) {
      align(game);
      game.drop();
    }
    expect(game.getSnapshot().rewardChoices).toContain(id);
    const before = game.getSnapshot().skills[key];
    expect(game.chooseReward(id)).toBe(true);
    const skills = game.getSnapshot().skills;
    expect(skills[key]).toBe(before + 1);
    expect(
      skills.magnetCharges + skills.repairCharges + skills.freezeCharges
    ).toBe(3);
    expect(game.chooseReward(id)).toBe(false);
    for (let i = 0; i < 5; i++) {
      align(game);
      game.drop();
    }
    expect(
      game
        .getSnapshot()
        .rewardChoices.some((choice) => choice.endsWith("Supply"))
    ).toBe(false);
  }
);
it("freeze misses clear their timer and do not bypass one-skill-per-layer after rescue", () => {
  const game = new GameSession(undefined, () => 0.999);
  game.start();
  for (let i = 0; i < 5; i++) {
    align(game);
    game.drop();
  }
  game.chooseReward("shield");
  game.openSkillMenu();
  game.useSkill("freeze");
  game.drop();
  expect(game.getSnapshot()).toMatchObject({
    lastResult: "rescue",
    skills: { freezeRemainingMs: 0, usedThisLayer: true },
  });
  expect(game.openSkillMenu()).toBe(false);
});
it.each([
  ["normal", 0.05, 0.035, 2.2],
  ["easy", 0.04, 0.025, 1.8],
] as const)(
  "increases %s speed only between layers and caps it",
  (difficulty, base, growth, cap) => {
    const game = new GameSession();
    game.setDifficulty(difficulty);
    game.start();
    for (let layer = 0; layer < 60; layer++) {
      const expected = base * Math.min(cap, 1 + growth * layer);
      expect(game.speed).toBeCloseTo(expected);
      align(game);
      expect(game.speed).toBeCloseTo(expected);
      game.drop();
      if (game.getSnapshot().phase === "reward")
        game.chooseReward(game.getSnapshot().rewardChoices[0]!);
    }
    expect(game.speed).toBeCloseTo(base * cap);
  }
);

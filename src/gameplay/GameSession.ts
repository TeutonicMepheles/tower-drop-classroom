import type {
  BlockData,
  Difficulty,
  GameCommands,
  GameEvent,
  GameSnapshot,
  Records,
  RewardId,
} from "@/contracts/game";
import { GAME_CONFIG } from "./difficulty";
import { REWARD_INTERVAL, emptyRewards, drawRewards } from "./rewards";
import { measureLanding } from "./stacking";

const cloneBlock = (block: BlockData): BlockData => ({
  ...block,
  position: { ...block.position },
  sizes: { ...block.sizes },
});
/** Owns all live tower data. No browser, rendering or physics objects enter this model. */
export class GameSession implements GameCommands {
  private blocks: BlockData[] = [];
  private nextId = 0;
  private movingBack = false;
  private events: GameEvent[] = [];
  private records: Records;
  private snapshot: GameSnapshot;
  constructor(
    records: Records = { easy: 0, normal: 0 },
    private readonly random: () => number = Math.random
  ) {
    this.records = { ...records };
    this.snapshot = this.freshSnapshot("normal", "ready");
    this.resetBlocks();
  }
  private freshSnapshot(
    difficulty: Difficulty,
    phase: GameSnapshot["phase"]
  ): GameSnapshot {
    return {
      difficulty,
      phase,
      score: 0,
      layers: 0,
      perfectStreak: 0,
      lastResult: "none",
      rewards: emptyRewards(),
      rewardChoices: [],
      layersUntilReward: REWARD_INTERVAL,
      shields: 0,
      rescuesUsed: 0,
      perfectCount: 0,
      longestStreak: 0,
      bestLayers: this.records[difficulty],
      recordBroken: false,
    };
  }
  public getSnapshot(): Readonly<GameSnapshot> {
    return {
      ...this.snapshot,
      rewards: { ...this.snapshot.rewards },
      rewardChoices: [...this.snapshot.rewardChoices],
    };
  }
  public getBlocks(): BlockData[] {
    return this.blocks.map(cloneBlock);
  }
  public getRecords(): Records {
    return { ...this.records };
  }
  public drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
  public get speed(): number {
    return (
      GAME_CONFIG[this.snapshot.difficulty].speed *
      0.92 ** this.snapshot.rewards.slow
    );
  }
  private resetBlocks(): void {
    this.events = [];
    this.movingBack = false;
    this.blocks = [
      {
        id: this.nextId++,
        position: { x: 0, y: 0, z: 0 },
        sizes: { width: 3, height: 1, depth: 3 },
        direction: "z",
        layer: 0,
      },
      {
        id: this.nextId++,
        position: { x: -10, y: 1, z: 0 },
        sizes: { width: 3, height: 1, depth: 3 },
        direction: "x",
        layer: 1,
      },
    ];
  }
  public start(): void {
    if (this.snapshot.phase === "playing" || this.snapshot.phase === "reward")
      return;
    this.resetBlocks();
    this.snapshot = this.freshSnapshot(this.snapshot.difficulty, "playing");
  }
  public setDifficulty(difficulty: Difficulty): void {
    if (
      this.snapshot.phase === "playing" ||
      this.snapshot.phase === "reward" ||
      !(difficulty in GAME_CONFIG)
    )
      return;
    this.snapshot.difficulty = difficulty;
    this.snapshot.bestLayers = this.records[difficulty];
  }
  /** frameScale keeps the original 60 Hz reference speed; runtime supplies a clamped delta. */
  public advance(frameScale: number): void {
    if (this.snapshot.phase !== "playing") return;
    const top = this.blocks.at(-1)!;
    const bottom = this.blocks.at(-2)!;
    const delta = Math.round(
      top.position[top.direction] - bottom.position[top.direction]
    );
    top.position[top.direction] +=
      this.speed * frameScale * (this.movingBack ? -1 : 1);
    if (this.movingBack && delta === -5) this.movingBack = false;
    else if (!this.movingBack && delta === 5) this.movingBack = true;
  }
  public chooseReward(id: RewardId): boolean {
    const state = this.snapshot;
    if (state.phase !== "reward" || !state.rewardChoices.includes(id))
      return false;
    state.rewards[id] += 1;
    if (id === "shield") state.shields += 1;
    if (id === "repair")
      for (const block of this.blocks.slice(-2)) {
        block.sizes.width = Math.min(3, block.sizes.width + 0.3);
        block.sizes.depth = Math.min(3, block.sizes.depth + 0.3);
      }
    state.phase = "playing";
    state.rewardChoices = [];
    state.layersUntilReward = REWARD_INTERVAL;
    this.events.push({ type: "reward", id, blockId: this.blocks.at(-2)!.id });
    return true;
  }
  public drop(): void {
    const state = this.snapshot;
    if (state.phase !== "playing") return;
    const top = this.blocks.at(-1)!;
    const bottom = this.blocks.at(-2)!;
    const axis = top.direction;
    const { delta, overlap, perfect } = measureLanding(
      top,
      bottom,
      GAME_CONFIG[state.difficulty].perfectTolerance *
        (1 + 0.2 * state.rewards.precision)
    );
    if (perfect) top.position[axis] = bottom.position[axis];
    if (overlap <= 0) {
      if (state.shields > 0) {
        state.shields -= 1;
        state.rescuesUsed += 1;
        state.perfectStreak = 0;
        state.lastResult = "rescue";
        top.position[axis] = bottom.position[axis] - 10;
        this.movingBack = false;
        this.events.push({ type: "rescued", blockId: top.id });
      } else {
        state.phase = "ended";
        state.lastResult = "miss";
        state.perfectStreak = 0;
      }
      return;
    }
    this.movingBack = false;
    state.perfectStreak = perfect ? state.perfectStreak + 1 : 0;
    state.score += perfect ? Math.min(state.perfectStreak, 5) : 1;
    state.layers += 1;
    if (perfect) state.perfectCount += 1;
    state.longestStreak = Math.max(state.longestStreak, state.perfectStreak);
    if (state.layers > this.records[state.difficulty]) {
      state.recordBroken = true;
      this.records[state.difficulty] = state.layers;
      state.bestLayers = state.layers;
    }
    state.lastResult = perfect ? "perfect" : "normal";
    if (axis === "x") top.sizes.width = overlap;
    else top.sizes.depth = overlap;
    top.position[axis] -= delta / 2;
    const lost = Math.abs(delta);
    if (lost > 0) {
      const fragment = cloneBlock(top);
      fragment.id = this.nextId++;
      fragment.position[axis] += (overlap / 2 + lost / 2) * Math.sign(delta);
      if (axis === "x") fragment.sizes.width = lost;
      else fragment.sizes.depth = lost;
      this.events.push({ type: "fragment", block: fragment });
    }
    const recovered = lost * 0.15 * state.rewards.steady;
    const growth = perfect ? 0.03 * state.rewards.perfectRepair : 0;
    top.sizes.width = Math.min(
      3,
      top.sizes.width + (axis === "x" ? recovered : 0) + growth
    );
    top.sizes.depth = Math.min(
      3,
      top.sizes.depth + (axis === "z" ? recovered : 0) + growth
    );
    this.events.push({ type: "landed", block: cloneBlock(top), perfect });
    this.blocks.push({
      id: this.nextId++,
      layer: this.blocks.length,
      direction: axis === "x" ? "z" : "x",
      position: {
        x: axis === "x" ? top.position.x : -10,
        y: this.blocks.length,
        z: axis === "z" ? top.position.z : -10,
      },
      sizes: { ...top.sizes },
    });
    state.layersUntilReward =
      REWARD_INTERVAL - (state.layers % REWARD_INTERVAL);
    if (state.layers % REWARD_INTERVAL === 0) {
      state.rewardChoices = drawRewards(
        state.rewards,
        state.shields,
        Math.min(top.sizes.width, top.sizes.depth) < 1.8,
        this.random,
        top.sizes.width < 3 || top.sizes.depth < 3
      );
      if (state.rewardChoices.length > 0) {
        state.phase = "reward";
        state.layersUntilReward = 0;
      }
    }
  }
}

import type {
  BlockData,
  Difficulty,
  GameCommands,
  GameEvent,
  GameSnapshot,
  Records,
  RewardId,
} from "@/contracts/game";
import {
  GAME_CONFIG,
  MOVEMENT_RADIUS,
  PRECISION_GAIN,
} from "@/gameplay/difficulty";
import { REWARD_INTERVAL, emptyRewards, drawRewards } from "@/gameplay/rewards";
import { measureLanding } from "@/gameplay/stacking";

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
      skills: {
        magnetCharges: 1,
        menuOpen: false,
        remainingMs: 2000,
        usedThisLayer: false,
        canUseMagnet: false,
      },
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
      skills: { ...this.snapshot.skills, canUseMagnet: this.canUseMagnet() },
      rewards: { ...this.snapshot.rewards },
      rewardChoices: [...this.snapshot.rewardChoices],
    };
  }
  private canUseMagnet(): boolean {
    const state = this.snapshot;
    if (
      state.phase !== "playing" ||
      !state.skills.menuOpen ||
      state.skills.magnetCharges < 1 ||
      state.skills.usedThisLayer
    )
      return false;
    const [bottom, top] = this.blocks.slice(-2);
    if (!bottom || !top) return false;
    const size = top.direction === "x" ? top.sizes.width : top.sizes.depth;
    const range = Math.min(0.9, size * 0.5);
    return (
      Math.abs(top.position[top.direction] - bottom.position[top.direction]) <=
      range
    );
  }
  public openSkillMenu(): boolean {
    const { skills, phase } = this.snapshot;
    if (
      phase !== "playing" ||
      skills.menuOpen ||
      skills.magnetCharges < 1 ||
      skills.remainingMs <= 0 ||
      skills.usedThisLayer
    )
      return false;
    skills.menuOpen = true;
    return true;
  }
  public closeSkillMenu(): void {
    this.snapshot.skills.menuOpen = false;
  }
  public useMagnet(): boolean {
    if (!this.canUseMagnet()) return false;
    const [bottom, top] = this.blocks.slice(-2);
    const skills = this.snapshot.skills;
    skills.magnetCharges -= 1;
    skills.usedThisLayer = true;
    skills.menuOpen = false;
    top!.position[top!.direction] = bottom!.position[top!.direction];
    this.drop();
    return true;
  }
  public get timeScale(): number {
    return this.snapshot.skills.menuOpen ? 0.2 : 1;
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
    return GAME_CONFIG[this.snapshot.difficulty].speed;
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
        position: { x: -MOVEMENT_RADIUS, y: 1, z: 0 },
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
  public advance(
    frameScale: number,
    elapsedMs = (frameScale * 1000) / 60
  ): void {
    if (this.snapshot.phase !== "playing") return;
    const skills = this.snapshot.skills;
    if (skills.menuOpen) {
      const elapsed = Math.max(0, elapsedMs);
      const slowMs = Math.min(elapsed, skills.remainingMs);
      frameScale *= elapsed > 0 ? 1 - (0.8 * slowMs) / elapsed : 0.2;
      skills.remainingMs = Math.max(0, skills.remainingMs - elapsed);
      if (skills.remainingMs === 0) skills.menuOpen = false;
    }
    const top = this.blocks.at(-1)!;
    const bottom = this.blocks.at(-2)!;
    // Fold elapsed travel into a triangle wave, retaining overshoot at either edge.
    // Bounds follow the tower even after off-centre cuts, on both movement axes.
    const axis = top.direction;
    const span = MOVEMENT_RADIUS * 2;
    const offset = top.position[axis] - bottom.position[axis] + MOVEMENT_RADIUS;
    const phase = this.movingBack ? span * 2 - offset : offset;
    const travel = (phase + this.speed * Math.max(0, frameScale)) % (span * 2);
    this.movingBack = travel >= span;
    top.position[axis] =
      bottom.position[axis] -
      MOVEMENT_RADIUS +
      (this.movingBack ? span * 2 - travel : travel);
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
    if (state.phase !== "playing" || state.skills.menuOpen) return;
    const top = this.blocks.at(-1)!;
    const bottom = this.blocks.at(-2)!;
    const axis = top.direction;
    const { delta, overlap, perfect } = measureLanding(
      top,
      bottom,
      GAME_CONFIG[state.difficulty].perfectTolerance *
        (1 + PRECISION_GAIN * state.rewards.precision)
    );
    if (perfect) top.position[axis] = bottom.position[axis];
    if (overlap <= 0) {
      if (state.shields > 0) {
        state.shields -= 1;
        state.rescuesUsed += 1;
        state.perfectStreak = 0;
        state.lastResult = "rescue";
        top.position[axis] = bottom.position[axis] - MOVEMENT_RADIUS;
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
    state.skills.remainingMs = 2000;
    state.skills.usedThisLayer = false;
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
        x: axis === "x" ? top.position.x : top.position.x - MOVEMENT_RADIUS,
        y: this.blocks.length,
        z: axis === "z" ? top.position.z : top.position.z - MOVEMENT_RADIUS,
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

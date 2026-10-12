import type {
  Difficulty,
  GameCommands,
  GameSnapshot,
  RewardId,
} from "@/contracts/game";
import type {
  AnimationDriver,
  PhysicsPort,
  RecordStore,
  ScenePort,
} from "@/contracts/ports";
import type { GameSession } from "@/gameplay/GameSession";
import { FrameLoop } from "@/runtime/frameLoop";
export class GameController implements GameCommands {
  private readonly loop: FrameLoop;
  private disposed = false;
  constructor(
    private readonly session: GameSession,
    private readonly scene: ScenePort,
    private readonly physics: PhysicsPort,
    driver: AnimationDriver,
    private readonly store: RecordStore,
    private readonly publish: (state: Readonly<GameSnapshot>) => void
  ) {
    this.loop = new FrameLoop(driver, (scale, elapsedMs) => {
      this.tick(scale, elapsedMs);
    });
    this.sync();
    this.scene.render();
  }
  public getSnapshot(): Readonly<GameSnapshot> {
    return this.session.getSnapshot();
  }
  private sync(): void {
    const blocks = this.session.getBlocks();
    this.physics.sync(blocks);
    this.scene.sync(blocks, this.physics.getFragments());
  }
  private changed(): void {
    const events = this.session.drainEvents();
    for (const event of events)
      if (event.type === "fragment") this.physics.addFragment(event.block);
    this.sync();
    const state = this.getSnapshot();
    this.scene.feedback(events, state.phase);
    if (state.phase === "playing") this.loop.start();
    else this.loop.stop();
    this.publish(state);
    this.scene.render();
  }
  private tick(scale: number, elapsedMs: number): void {
    if (this.disposed || this.getSnapshot().phase !== "playing") return;
    const wasOpen = this.getSnapshot().skills.menuOpen;
    const motionScale = scale * this.session.timeScale;
    this.session.advance(scale, elapsedMs);
    this.scene.follow(
      this.getSnapshot().layers,
      this.session.speed * motionScale
    );
    this.physics.sync(this.session.getBlocks());
    this.physics.step(this.scene.cameraHeight - 20, motionScale);
    this.scene.sync(this.session.getBlocks(), this.physics.getFragments());
    this.scene.render();
    if (wasOpen) this.publish(this.getSnapshot());
  }
  public start(): void {
    if (
      this.disposed ||
      this.getSnapshot().phase === "playing" ||
      this.getSnapshot().phase === "reward"
    )
      return;
    this.loop.stop();
    this.physics.reset();
    this.scene.reset();
    this.session.start();
    this.changed();
  }
  public drop(): void {
    if (this.disposed || this.getSnapshot().phase !== "playing") return;
    const before = this.getSnapshot().bestLayers;
    this.session.drop();
    if (this.getSnapshot().bestLayers > before)
      this.store.save(this.session.getRecords());
    this.changed();
  }
  public openSkillMenu(): boolean {
    if (this.disposed || !this.session.openSkillMenu()) return false;
    this.changed();
    return true;
  }
  public closeSkillMenu(): void {
    if (this.disposed || !this.getSnapshot().skills.menuOpen) return;
    this.session.closeSkillMenu();
    this.changed();
  }
  public useMagnet(): boolean {
    if (this.disposed) return false;
    const before = this.getSnapshot().bestLayers;
    if (!this.session.useMagnet()) return false;
    if (this.getSnapshot().bestLayers > before)
      this.store.save(this.session.getRecords());
    this.changed();
    return true;
  }
  public setDifficulty(difficulty: Difficulty): void {
    if (this.disposed) return;
    const phase = this.getSnapshot().phase;
    if (phase === "playing" || phase === "reward") return;
    this.session.setDifficulty(difficulty);
    this.changed();
  }
  public chooseReward(id: RewardId): boolean {
    if (this.disposed || !this.session.chooseReward(id)) return false;
    this.changed();
    return true;
  }
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.physics.dispose();
    this.scene.dispose();
  }
}

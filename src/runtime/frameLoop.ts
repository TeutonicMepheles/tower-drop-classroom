import type { AnimationDriver } from "@/contracts/ports";
export class FrameLoop {
  private running = false;
  private lastTime = 0;
  constructor(
    private readonly driver: AnimationDriver,
    private readonly tick: (scale: number, elapsedMs: number) => void,
    private readonly now: () => number = () => performance.now()
  ) {}
  private readonly frame = (time?: number): void => {
    if (!this.running) return;
    const elapsedMs =
      time === undefined ? 1000 / 60 : Math.max(time - this.lastTime, 0);
    const scale = Math.min(elapsedMs / 1000, 0.05) * 60;
    this.lastTime = time ?? this.now();
    this.tick(scale, elapsedMs);
  };
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.now();
    this.driver.setAnimationLoop(this.frame);
  }
  public stop(): void {
    this.running = false;
    this.driver.setAnimationLoop(null);
  }
}

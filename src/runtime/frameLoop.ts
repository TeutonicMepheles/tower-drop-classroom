import type { AnimationDriver } from "@/contracts/ports";
export class FrameLoop {
  private running = false;
  private lastTime = 0;
  constructor(
    private readonly driver: AnimationDriver,
    private readonly tick: (scale: number) => void,
    private readonly now: () => number = () => performance.now()
  ) {}
  private readonly frame = (time?: number): void => {
    if (!this.running) return;
    const scale =
      time === undefined
        ? 1
        : Math.min(Math.max((time - this.lastTime) / 1000, 0), 0.05) * 60;
    this.lastTime = time ?? this.now();
    this.tick(scale);
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

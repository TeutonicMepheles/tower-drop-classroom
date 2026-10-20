/**
 * Drives background art-style switching. Purely cosmetic: it only toggles which
 * scene layer is visible (via `data-active`) and which palette each layer shows
 * (via `data-style`). The cross-fade itself is a GPU-composited `opacity`
 * transition declared in CSS — no gradient re-rasterization, so it stays smooth.
 *
 * Gameplay and UI never touch this; it reacts to reward events only.
 */
export class BackgroundStyle {
  private index = 0;
  private active: "a" | "b" = "a";
  private durationMs = 1200;
  private hideTimer: number | undefined;
  private readonly layerA: HTMLElement;
  private readonly layerB: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly styleCount = 5
  ) {
    this.layerA = root.querySelector<HTMLElement>('[data-layer="a"]')!;
    this.layerB = root.querySelector<HTMLElement>('[data-layer="b"]')!;
    this.reset();
  }
  /** Advance to the next style (wraps around). Call on each reward pickup. */
  public next(): void {
    const target = this.active === "a" ? this.layerB : this.layerA;
    const targetKey = this.active === "a" ? "b" : "a";
    this.index = (this.index + 1) % this.styleCount;
    // Reveal the target layer first, then flip opacity on the next frame so the
    // transition actually runs (display:none -> block needs a frame to animate).
    target.style.display = "";
    target.dataset.style = String(this.index);
    requestAnimationFrame(() => {
      this.root.dataset.active = targetKey;
      this.active = targetKey;
      this.scheduleHide();
    });
  }
  /** Return to the starting style. Call when a new run begins. */
  public reset(): void {
    if (this.hideTimer !== undefined) clearTimeout(this.hideTimer);
    this.index = 0;
    this.layerA.style.display = "";
    this.layerB.style.display = "none";
    this.layerA.dataset.style = "0";
    this.layerB.dataset.style = "0";
    this.root.dataset.active = "a";
    this.active = "a";
  }
  /**
   * Tune the cross-fade duration. Reserved for the next iteration where we
   * constrain the switch timing; CSS currently defaults to 1200ms.
   */
  public setTransitionDuration(ms: number): void {
    this.durationMs = Math.max(0, ms);
    this.root.style.setProperty("--atm-transition", `${this.durationMs}ms`);
  }
  private scheduleHide(): void {
    if (this.hideTimer !== undefined) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      const hidden = this.active === "a" ? this.layerB : this.layerA;
      hidden.style.display = "none";
    }, this.durationMs + 80);
  }
}

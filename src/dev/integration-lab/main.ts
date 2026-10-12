import { createGameApp } from "@/app/createGameApp";
import { GameSession } from "@/gameplay/GameSession";
import { loadRecords } from "@/storage/records";
import "@/ui/styles/global.css";
import "@/dev/ui-lab/uiLab.css";
// Test-only clock control: production commands, UI, rendering and physics remain real.
// This entry is not included in the production build.
if (!import.meta.env.DEV)
  throw new Error("Integration lab is development-only");
let offset = 0;
class FixtureSession extends GameSession {
  public override advance(_scale: number, elapsedMs = 0): void {
    super.advance(0, elapsedMs);
    /* Deterministic fixture clock; drops advance to the selected position. */
  }
  public override drop(): void {
    if (this.getSnapshot().phase === "playing") {
      const top = this.getBlocks().at(-1)!,
        bottom = this.getBlocks().at(-2)!;
      super.advance(
        (bottom.position[top.direction] +
          offset -
          top.position[top.direction]) /
          this.speed
      );
    }
    super.drop();
  }
}
const page = createGameApp(new FixtureSession(loadRecords(), () => 0.999));
const toolbar = document.createElement("nav");
toolbar.className = "lab-controls";
toolbar.setAttribute("aria-label", "集成验收测试夹具");
for (const [label, value] of [
  ["完美对齐", 0],
  ["普通裁切", 0.5],
  ["模拟落空", 4],
] as const) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = (): void => {
    offset = value;
  };
  toolbar.append(button);
}
document.querySelector("#app")!.append(page, toolbar);
window.addEventListener(
  "pagehide",
  () => {
    page.cleanup?.();
  },
  { once: true }
);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    page.cleanup?.();
  });

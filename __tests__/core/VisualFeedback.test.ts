import * as THREE from "three";
import { TowerDrop } from "@/core/TowerDrop";
import { VISUAL_THEME } from "@/config/visualTheme";
import type { Page } from "@/types/pages";

describe("perfect block visual feedback", () => {
  it("restores the material after feedback expires and releases it on dispose", () => {
    jest.clearAllMocks();
    const page: Page = document.createElement("main");
    page.innerHTML =
      '<canvas></canvas><button id="playbtn" class="tower-drop__button">Play</button>';
    document.body.append(page);
    const clock = jest.spyOn(performance, "now").mockReturnValue(1000);
    const game = new TowerDrop(page.querySelector("canvas")!, page);
    page.querySelector<HTMLButtonElement>("button")!.click();
    const landed = (THREE.Mesh as unknown as jest.Mock).mock.results.at(-1)!
      .value as THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>;
    window.dispatchEvent(new MouseEvent("click"));
    expect(landed.material.emissive.set).toHaveBeenCalledWith(
      VISUAL_THEME.feedback.color
    );
    expect(landed.material.emissiveIntensity).toBe(
      VISUAL_THEME.feedback.intensity
    );
    clock.mockReturnValue(1000 + VISUAL_THEME.feedback.durationMs + 1);
    const renderer = (THREE.WebGLRenderer as unknown as jest.Mock).mock
      .results[0]!.value as { setAnimationLoop: jest.Mock };
    const tick = renderer.setAnimationLoop.mock.calls.at(-1)![0] as () => void;
    tick();
    expect(landed.material.emissiveIntensity).toBe(0);
    expect(landed.material.emissive.set).toHaveBeenLastCalledWith("#000000");
    game.dispose();
    page.remove();
    clock.mockRestore();
  });
});

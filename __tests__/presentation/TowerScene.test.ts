import * as THREE from "three";
import { TowerScene } from "@/presentation/TowerScene";
import { VISUAL_THEME } from "@/config/visualTheme";
import type { BlockData } from "@/contracts/game";
const block: BlockData = {
  id: 1,
  layer: 1,
  position: { x: 0, y: 1, z: 0 },
  sizes: { width: 3, height: 1, depth: 3 },
  direction: "x",
};
it("updates geometry while preserving material, expires feedback and releases resources once", () => {
  jest.clearAllMocks();
  const clock = jest.spyOn(performance, "now").mockReturnValue(1000);
  const scene = new TowerScene(
    document.createElement("canvas"),
    document.createElement("main")
  );
  scene.sync([block], []);
  const mesh = (THREE.Mesh as unknown as jest.Mock).mock.results.at(-1)!
    .value as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  const material = mesh.material;
  const geometry = mesh.geometry;
  scene.sync([{ ...block, sizes: { ...block.sizes, width: 2.5 } }], []);
  expect(geometry.dispose).toHaveBeenCalled();
  expect(mesh.material).toBe(material);
  scene.feedback([{ type: "landed", block, perfect: true }], "playing");
  expect(material.emissiveIntensity).toBe(VISUAL_THEME.feedback.intensity);
  clock.mockReturnValue(1000 + VISUAL_THEME.feedback.durationMs + 1);
  scene.render();
  expect(material.emissiveIntensity).toBe(0);
  scene.resize(600, 900, 3);
  const renderer = (
    THREE.WebGLRenderer as unknown as jest.Mock
  ).mock.results.at(-1)!.value;
  expect(renderer.setSize).toHaveBeenLastCalledWith(600, 900);
  expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(2);
  scene.dispose();
  scene.dispose();
  expect(renderer.dispose).toHaveBeenCalledTimes(1);
  expect(material.dispose).toHaveBeenCalledTimes(1);
});

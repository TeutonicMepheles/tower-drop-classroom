import * as THREE from "three";
import { PerfectRings } from "../../src/visual/PerfectRings";

it("bounds perfect rings and clears them on expiration or restart", () => {
  const scene = new THREE.Scene();
  const rings = new PerfectRings(scene);
  const surface = { x: 2, y: 1, z: -3, width: 2, depth: 3 };
  for (let i = 0; i < 10; i++) rings.emit(surface, 100);
  expect(rings.activeCount).toBe(6);
  rings.update(1000);
  expect(rings.activeCount).toBe(0);
  rings.emit(surface, 1100);
  rings.clear();
  expect(rings.activeCount).toBe(0);
  rings.dispose();
  rings.dispose();
  expect(scene.remove).toHaveBeenCalledTimes(6);
});

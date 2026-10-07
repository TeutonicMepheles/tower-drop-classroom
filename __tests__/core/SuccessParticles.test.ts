import * as THREE from "three";
import { SuccessParticles } from "../../src/visual/SuccessParticles";

describe("landing particle lifecycle", () => {
  const surface = { x: 0, y: 1, z: 0, width: 3, depth: 3 };
  it("reuses a bounded buffer and expires bursts", () => {
    const particles = new SuccessParticles(new THREE.Scene());
    particles.emit(surface, 100);
    expect(particles.activeCount).toBe(18);
    for (let i = 0; i < 20; i++) particles.emit(surface, 100);
    expect(particles.activeCount).toBe(160);
    particles.update(1200);
    expect(particles.activeCount).toBe(0);
    particles.dispose();
  });
  it("clears the previous round and releases its scene object", () => {
    const scene = new THREE.Scene();
    const particles = new SuccessParticles(scene);
    particles.emit(surface, 100);
    particles.clear();
    expect(particles.activeCount).toBe(0);
    particles.dispose();
    particles.dispose();
    expect(scene.remove).toHaveBeenCalledTimes(7);
  });
});

import * as THREE from "three";
import type { LandingSurface } from "./SuccessParticles";

/** Six reusable outlines follow the actual cropped landing surface. */
export class PerfectRings {
  private readonly rings = Array.from({ length: 6 }, () => {
    const vertices = new Float32Array(12);
    const attribute = new THREE.BufferAttribute(vertices, 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", attribute);
    const material = new THREE.LineBasicMaterial({
      color: "#ffe99a",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.LineLoop(geometry, material);
    line.frustumCulled = false;
    return {
      vertices,
      attribute,
      geometry,
      material,
      line,
      born: -1,
      surface: { x: 0, y: 0, z: 0, width: 0, depth: 0 },
    };
  });
  private cursor = 0;
  constructor(private scene: THREE.Scene) {
    this.rings.forEach((ring) => scene.add(ring.line));
  }
  public emit(surface: LandingSurface, now: number): void {
    const ring = this.rings[this.cursor++ % this.rings.length]!;
    ring.surface = { ...surface };
    ring.born = now;
    this.update(now);
  }
  public update(now: number): void {
    for (const ring of this.rings) {
      if (ring.born < 0) continue;
      const age = Math.max(0, (now - ring.born) / 850);
      if (age >= 1) {
        ring.born = -1;
        ring.material.opacity = 0;
        continue;
      }
      const { x, y, z, width, depth } = ring.surface;
      const expansion = 0.04 + age * 0.9;
      const w = width / 2 + expansion;
      const d = depth / 2 + expansion;
      ring.vertices.set([
        x - w,
        y + 0.03,
        z - d,
        x + w,
        y + 0.03,
        z - d,
        x + w,
        y + 0.03,
        z + d,
        x - w,
        y + 0.03,
        z + d,
      ]);
      ring.attribute.needsUpdate = true;
      ring.material.opacity = (1 - age) ** 2;
    }
  }
  public get activeCount(): number {
    return this.rings.filter((ring) => ring.born >= 0).length;
  }
  public clear(): void {
    this.rings.forEach((ring) => {
      ring.born = -1;
      ring.material.opacity = 0;
    });
  }
  public dispose(): void {
    this.clear();
    this.rings.forEach((ring) => {
      this.scene.remove(ring.line);
      ring.geometry.dispose();
      ring.material.dispose();
    });
  }
}

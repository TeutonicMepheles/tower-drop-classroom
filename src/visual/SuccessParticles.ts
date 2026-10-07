import * as THREE from "three";
import { PerfectRings } from "./PerfectRings";

export interface LandingSurface {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
}

/** One fixed GPU buffer; successful landings reuse slots. */
export class SuccessParticles {
  private readonly capacity = 160;
  private readonly positions = new Float32Array(this.capacity * 3);
  private readonly velocities = new Float32Array(this.capacity * 3);
  private readonly opacity = new Float32Array(this.capacity);
  private readonly colors = new Float32Array(this.capacity * 3);
  private readonly sizes = new Float32Array(this.capacity);
  private readonly born = new Float64Array(this.capacity).fill(-1);
  private readonly lifetime = new Float32Array(this.capacity);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positionAttribute = new THREE.BufferAttribute(
    this.positions,
    3
  );
  private readonly opacityAttribute = new THREE.BufferAttribute(
    this.opacity,
    1
  );
  private readonly colorAttribute = new THREE.BufferAttribute(this.colors, 3);
  private readonly sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points;
  private readonly rings: PerfectRings;
  private cursor = 0;
  private lastTime = 0;
  private disposed = false;

  constructor(private scene: THREE.Scene) {
    this.rings = new PerfectRings(scene);
    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("aOpacity", this.opacityAttribute);
    this.geometry.setAttribute("aColor", this.colorAttribute);
    this.geometry.setAttribute("aSize", this.sizeAttribute);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { pixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `attribute float aOpacity; attribute vec3 aColor; attribute float aSize;
        uniform float pixelRatio; varying float vOpacity; varying vec3 vColor;
        void main() { vOpacity=aOpacity; vColor=aColor;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize*pixelRatio; }`,
      fragmentShader: `varying float vOpacity; varying vec3 vColor;
        void main() { float r=length(gl_PointCoord-vec2(0.5));
          if(r>0.5) discard;
          float glow=pow(1.0-r*2.0,1.7);
          gl_FragColor=vec4(vColor,glow*vOpacity); }`,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  public emit(surface: LandingSurface, now: number, perfect = false): void {
    if (perfect) this.rings.emit(surface, now);
    for (let i = 0; i < (perfect ? 44 : 18); i++) {
      const slot = this.cursor++ % this.capacity;
      const offset = slot * 3;
      const side = i % 4;
      const across = Math.random() - 0.5;
      const dx = side < 2 ? (side === 0 ? -1 : 1) : 0;
      const dz = side >= 2 ? (side === 2 ? -1 : 1) : 0;
      this.positions[offset] =
        surface.x + (dx ? (dx * surface.width) / 2 : across * surface.width);
      this.positions[offset + 1] = surface.y;
      this.positions[offset + 2] =
        surface.z + (dz ? (dz * surface.depth) / 2 : across * surface.depth);
      this.velocities[offset] = dx * (0.7 + Math.random());
      this.velocities[offset + 1] = 0.6 + Math.random() * 0.8;
      this.velocities[offset + 2] = dz * (0.7 + Math.random());
      this.colors.set(perfect ? [1, 0.8, 0.3] : [0.55, 0.9, 1], offset);
      this.sizes[slot] = 5 + Math.random() * 3;
      this.born[slot] = now;
      this.lifetime[slot] = (perfect ? 1000 : 650) + Math.random() * 350;
      this.opacity[slot] = 1;
    }
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.positionAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
  }

  public update(now: number): void {
    this.rings.update(now);
    const dt = Math.min(Math.max((now - this.lastTime) / 1000, 0), 0.05);
    this.lastTime = now;
    if (this.activeCount === 0) return;
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.born[slot]! < 0) continue;
      const age = (now - this.born[slot]!) / this.lifetime[slot]!;
      if (age >= 1) {
        this.born[slot] = -1;
        this.opacity[slot] = 0;
        continue;
      }
      const offset = slot * 3;
      this.velocities[offset + 1] = this.velocities[offset + 1]! - dt * 1.8;
      for (let axis = 0; axis < 3; axis++)
        this.positions[offset + axis] =
          this.positions[offset + axis]! + this.velocities[offset + axis]! * dt;
      this.opacity[slot] = (1 - age) ** 2;
    }
    this.positionAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
  }

  public get activeCount(): number {
    return this.born.reduce((count, time) => count + (time >= 0 ? 1 : 0), 0);
  }
  public clear(): void {
    this.rings.clear();
    this.born.fill(-1);
    this.opacity.fill(0);
    this.opacityAttribute.needsUpdate = true;
  }
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.rings.dispose();
    this.clear();
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }

  public resize(): void {
    this.material.uniforms.pixelRatio!.value = Math.min(
      window.devicePixelRatio,
      2
    );
  }
}

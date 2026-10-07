import * as THREE from "three";
import { blockColor } from "@/config/visualTheme";

export const SURFACES = [
  { name: "ceramic", roughness: 0.76, metalness: 0.03, glow: 0 },
  { name: "metal", roughness: 0.22, metalness: 0.45, glow: 0 },
  { name: "luminous", roughness: 0.38, metalness: 0.08, glow: 0.22 },
] as const;
const baseGlow = new WeakMap<
  THREE.MeshStandardMaterial,
  { color: string; intensity: number }
>();
const outlines = new WeakMap<THREE.Mesh, THREE.LineSegments>();

function surfaceTexture(kind: string): THREE.DataTexture {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const noise = ((x * 17 + y * 31) % 13) / 13;
      const edge = x < 2 || y < 2 || x > 61 || y > 61;
      const value =
        kind === "metal"
          ? 205 + (y % 4) * 12
          : kind === "luminous"
            ? edge
              ? 255
              : 200
            : 231 + noise * 24;
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function createBlockMaterial(layer: number): THREE.MeshStandardMaterial {
  const surface = SURFACES[layer % SURFACES.length]!;
  const color = blockColor(layer);
  const material = new THREE.MeshStandardMaterial({
    color,
    map: surfaceTexture(surface.name),
    roughness: surface.roughness,
    metalness: surface.metalness,
    emissive: surface.glow ? color : "#000000",
    emissiveIntensity: surface.glow,
  });
  material.name = surface.name;
  baseGlow.set(material, {
    color: surface.glow ? color : "#000000",
    intensity: surface.glow,
  });
  return material;
}

export function restoreBlockGlow(material: THREE.MeshStandardMaterial): void {
  const glow = baseGlow.get(material);
  material.emissive.set(glow?.color ?? "#000000");
  material.emissiveIntensity = glow?.intensity ?? 0;
}

export function addBlockOutline(mesh: THREE.Mesh): void {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: "#e2f6ff",
      transparent: true,
      opacity: 0.22,
    })
  );
  mesh.add(line);
  outlines.set(mesh, line);
}

export function releaseBlockOutline(
  mesh: THREE.Mesh,
  disposeTexture = true
): void {
  const material = mesh.material as THREE.MeshStandardMaterial;
  if (disposeTexture) material.map?.dispose();
  const line = outlines.get(mesh);
  if (!line) return;
  mesh.remove(line);
  line.geometry.dispose();
  (line.material as THREE.LineBasicMaterial).dispose();
  outlines.delete(mesh);
}

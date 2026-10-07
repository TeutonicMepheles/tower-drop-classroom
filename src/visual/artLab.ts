import * as THREE from "three";
import { Atmosphere } from "./Atmosphere";
import { SuccessParticles } from "./SuccessParticles";
import {
  createBlockMaterial,
  addBlockOutline,
  releaseBlockOutline,
} from "./blockMaterials";
import { VISUAL_THEME } from "../config/visualTheme";
import "./artLab.css";

const root = document.querySelector<HTMLElement>("#art-lab")!;
const atmosphere = new Atmosphere(root);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(VISUAL_THEME.fog.color, VISUAL_THEME.fog.density);
const renderer = new THREE.WebGLRenderer({
  canvas: root.querySelector("canvas")!,
  antialias: true,
  alpha: true,
});
const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
camera.position.set(5, 7, 5);
camera.lookAt(0, 1, 0);
scene.add(
  new THREE.AmbientLight(
    VISUAL_THEME.ambient.color,
    VISUAL_THEME.ambient.intensity
  )
);
const key = new THREE.DirectionalLight(
  VISUAL_THEME.key.color,
  VISUAL_THEME.key.intensity
);
key.position.set(10, 20, 0);
scene.add(key);
const blocks = Array.from({ length: 3 }, (_, layer) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.8, 3),
    createBlockMaterial(layer)
  );
  mesh.position.y = layer * 0.8;
  addBlockOutline(mesh);
  scene.add(mesh);
  return mesh;
});
const particles = new SuccessParticles(scene);
const surface = { x: 0, y: 1.2, z: 0, width: 3, depth: 3 };
document.querySelector("#normal")!.addEventListener("click", () => {
  particles.emit(surface, performance.now());
});
document.querySelector("#perfect")!.addEventListener("click", () => {
  particles.emit(surface, performance.now(), true);
});
document.querySelector("#clear")!.addEventListener("click", () => {
  particles.clear();
});
function resize(): void {
  particles.resize();
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -6 * aspect;
  camera.right = 6 * aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
resize();
window.addEventListener("resize", resize);
renderer.setAnimationLoop(() => {
  particles.update(performance.now());
  renderer.render(scene, camera);
});
window.addEventListener(
  "pagehide",
  () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener("resize", resize);
    particles.dispose();
    atmosphere.dispose();
    blocks.forEach((mesh) => {
      releaseBlockOutline(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    renderer.dispose();
  },
  { once: true }
);

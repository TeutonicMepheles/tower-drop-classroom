import * as THREE from "three";
import type { BlockData, GameEvent, GameSnapshot } from "@/contracts/game";
import type {
  AnimationDriver,
  FragmentPose,
  ScenePort,
} from "@/contracts/ports";
import { Atmosphere } from "@/presentation/effects/Atmosphere";
import { SuccessParticles } from "@/presentation/effects/SuccessParticles";
import {
  createBlockMaterial,
  addBlockOutline,
  releaseBlockOutline,
  restoreBlockGlow,
} from "@/presentation/materials/blockMaterials";
import { VISUAL_THEME } from "@/presentation/theme";
import { BackgroundStyle } from "@/presentation/BackgroundStyle";
interface View {
  block: BlockData;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
}
export class TowerScene implements ScenePort, AnimationDriver {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    -7.5,
    7.5,
    7.5,
    -7.5,
    1,
    100
  );
  private readonly renderer: THREE.WebGLRenderer;
  private readonly atmosphere: Atmosphere;
  private readonly particles: SuccessParticles;
  private readonly backgroundStyle: BackgroundStyle;
  private movingId: number | undefined;
  private readonly views = new Map<number, View>();
  private feedbackMaterial: THREE.MeshStandardMaterial | undefined;
  private feedbackUntil = 0;
  private disposed = false;
  constructor(canvas: HTMLCanvasElement, host: HTMLElement) {
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(
      VISUAL_THEME.fog.color,
      VISUAL_THEME.fog.density
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.atmosphere = new Atmosphere(host);
    this.backgroundStyle = new BackgroundStyle(this.atmosphere.element);
    this.particles = new SuccessParticles(this.scene);
    this.camera.position.set(4, 4, 4);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
    const ambient = new THREE.AmbientLight(
      VISUAL_THEME.ambient.color,
      VISUAL_THEME.ambient.intensity
    );
    const key = new THREE.DirectionalLight(
      VISUAL_THEME.key.color,
      VISUAL_THEME.key.intensity
    );
    key.position.set(10, 20, 0);
    this.scene.add(ambient);
    this.scene.add(key);
  }
  public get cameraHeight(): number {
    return this.camera.position.y;
  }
  public setAnimationLoop(callback: ((time?: number) => void) | null): void {
    this.renderer.setAnimationLoop(callback);
  }
  private release(view: View): void {
    if (this.feedbackMaterial === view.mesh.material) this.clearFeedback();
    releaseBlockOutline(view.mesh);
    view.mesh.geometry.dispose();
    view.mesh.material.dispose();
    this.scene.remove(view.mesh);
  }
  private update(block: BlockData): View {
    let view = this.views.get(block.id);
    if (!view) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          block.sizes.width,
          block.sizes.height,
          block.sizes.depth
        ),
        createBlockMaterial(block.layer)
      );
      addBlockOutline(mesh);
      this.scene.add(mesh);
      view = { block, mesh };
      this.views.set(block.id, view);
    } else if (
      view.block.sizes.width !== block.sizes.width ||
      view.block.sizes.depth !== block.sizes.depth ||
      view.block.sizes.height !== block.sizes.height
    ) {
      releaseBlockOutline(view.mesh, false);
      view.mesh.geometry.dispose();
      view.mesh.geometry = new THREE.BoxGeometry(
        block.sizes.width,
        block.sizes.height,
        block.sizes.depth
      );
      addBlockOutline(view.mesh);
    }
    view.block = block;
    view.mesh.position.set(
      block.position.x,
      block.position.y,
      block.position.z
    );
    return view;
  }
  public hitTestMovingBlock(clientX: number, clientY: number): boolean {
    const view =
      this.movingId === undefined ? undefined : this.views.get(this.movingId);
    if (!view || this.disposed) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const point = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2
    );
    this.camera.updateMatrixWorld();
    view.mesh.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(point, this.camera);
    const bounds = new THREE.Box3()
      .setFromObject(view.mesh)
      .expandByScalar(0.15);
    return ray.ray.intersectsBox(bounds);
  }
  public sync(
    blocks: readonly BlockData[],
    fragments: readonly FragmentPose[]
  ): void {
    this.movingId = blocks.at(-1)?.id;
    const ids = new Set([
      ...blocks.map((b) => b.id),
      ...fragments.map((f) => f.block.id),
    ]);
    for (const [id, view] of this.views)
      if (!ids.has(id)) {
        this.release(view);
        this.views.delete(id);
      }
    for (const block of blocks) this.update(block);
    for (const fragment of fragments) {
      const view = this.update(fragment.block);
      view.mesh.position.copy(fragment.position);
      view.mesh.quaternion.copy(fragment.quaternion);
    }
  }
  private clearFeedback(): void {
    if (this.feedbackMaterial) restoreBlockGlow(this.feedbackMaterial);
    this.feedbackMaterial = undefined;
  }
  public feedback(
    events: readonly GameEvent[],
    phase: GameSnapshot["phase"]
  ): void {
    for (const event of events) {
      if (event.type === "landed") {
        const block = event.block;
        this.particles.emit(
          {
            x: block.position.x,
            y: block.position.y - block.sizes.height / 2,
            z: block.position.z,
            width: block.sizes.width,
            depth: block.sizes.depth,
          },
          performance.now(),
          event.perfect
        );
        if (event.perfect) {
          this.clearFeedback();
          const material = this.views.get(block.id)?.mesh.material;
          if (material) {
            material.emissive.set(VISUAL_THEME.feedback.color);
            material.emissiveIntensity = VISUAL_THEME.feedback.intensity;
            this.feedbackMaterial = material;
            this.feedbackUntil =
              performance.now() + VISUAL_THEME.feedback.durationMs;
          }
        }
      } else if (event.type === "reward") {
        this.backgroundStyle.next();
      }
    }
    if (phase === "ready" || phase === "ended") {
      this.clearFeedback();
      this.particles.clear();
    }
  }
  public follow(layers: number, movement: number): void {
    if (this.camera.position.y < layers + 4) this.camera.position.y += movement;
  }
  public render(): void {
    this.particles.update(performance.now());
    if (performance.now() >= this.feedbackUntil) this.clearFeedback();
    this.renderer.render(this.scene, this.camera);
  }
  public resize(width: number, height: number, pixelRatio: number): void {
    this.particles.resize();
    const cameraHeight = 15 / (width / height);
    this.camera.left = -7.5;
    this.camera.right = 7.5;
    this.camera.top = cameraHeight / 2;
    this.camera.bottom = -cameraHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(pixelRatio, 2));
    this.render();
  }
  public reset(): void {
    this.backgroundStyle.reset();
    this.clearFeedback();
    this.particles.clear();
    for (const view of this.views.values()) this.release(view);
    this.views.clear();
    this.camera.position.y = 4;
    this.camera.updateProjectionMatrix();
  }
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.setAnimationLoop(null);
    this.reset();
    this.particles.dispose();
    this.atmosphere.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}

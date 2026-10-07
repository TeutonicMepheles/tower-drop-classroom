import * as THREE from "three";
import * as CANNON from "cannon";
import { Atmosphere } from "@/visual/Atmosphere";
import {
  createBlockMaterial,
  restoreBlockGlow,
  addBlockOutline,
  releaseBlockOutline,
} from "@/visual/blockMaterials";
import { VISUAL_THEME } from "@/config/visualTheme";
import { GAME_CONFIG, STATE_EVENT, LANDED_EVENT } from "@/config/gameConfig";
import type {
  Difficulty,
  GameSnapshot,
  LandedDetail,
} from "@/config/gameConfig";

import type { Block, Sizes } from "@/types/app";
import type {
  AddBlockArgs,
  AddFallBlockArgs,
  CreateBlockArgs,
} from "@/types/args";
import type { GameState } from "@/types/states";
import type { Page } from "@/types/pages";

export class TowerDrop {
  private feedbackMaterial: THREE.MeshStandardMaterial | undefined;
  private feedbackUntil = 0;
  private onLanded = (event: Event): void => {
    const detail = (event as CustomEvent<LandedDetail>).detail;
    if (!detail.perfect) return;
    this.clearFeedback();
    const material = this.gameState.blocks[detail.index]?.mesh.material;
    if (!material) return;
    material.emissive.set(VISUAL_THEME.feedback.color);
    material.emissiveIntensity = VISUAL_THEME.feedback.intensity;
    this.feedbackMaterial = material;
    this.feedbackUntil = performance.now() + VISUAL_THEME.feedback.durationMs;
  };
  private onRoundState = (event: Event): void => {
    if ((event as CustomEvent<GameSnapshot>).detail.phase !== "playing") {
      this.clearFeedback();
      this.render();
    }
  };
  private clearFeedback(): void {
    if (this.feedbackMaterial) restoreBlockGlow(this.feedbackMaterial);
    this.feedbackMaterial = undefined;
  }

  private atmosphere: Atmosphere;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;

  private sizes: Sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  private blockSizes: Sizes = {
    height: 1,
    width: 3,
    depth: 3,
  };
  private blockSpeed: number = GAME_CONFIG.normal.speed;
  private snapshot: GameSnapshot = {
    difficulty: "normal",
    phase: "ready",
    score: 0,
    layers: 0,
    perfectStreak: 0,
    lastResult: "none",
  };

  public getSnapshot(): Readonly<GameSnapshot> {
    return { ...this.snapshot };
  }

  public setDifficulty(difficulty: Difficulty): void {
    if (this.gameState.gameStarted || !(difficulty in GAME_CONFIG)) return;
    this.snapshot.difficulty = difficulty;
    this.blockSpeed = GAME_CONFIG[difficulty].speed;
    this.publishState();
  }

  private publishState(): void {
    this.container.dispatchEvent(
      new CustomEvent<GameSnapshot>(STATE_EVENT, {
        detail: { ...this.snapshot },
      })
    );
  }

  private gameState: GameState = {
    gameStarted: false,
    isMovingForward: false,
    blocks: [],
    fallBlocks: [],
  };

  private boundOnWindowResize: (event: UIEvent) => void;
  private boundOnWindowClick: (event: Event) => void;
  private boundOnGameStart: () => void;

  private isAnimating = false;

  private btnPlay: HTMLButtonElement | null = null;

  constructor(
    public canvas: HTMLCanvasElement,
    private container: Page
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(
      VISUAL_THEME.fog.color,
      VISUAL_THEME.fog.density
    );
    this.atmosphere = new Atmosphere(this.container);
    this.container.addEventListener(LANDED_EVENT, this.onLanded);
    this.container.addEventListener(STATE_EVENT, this.onRoundState);

    this.world = new CANNON.World();

    const cameraAspect = this.sizes.width / this.sizes.height;
    const cameraWidth = 15;
    const cameraHeight = cameraWidth / cameraAspect;

    this.camera = new THREE.OrthographicCamera(
      cameraWidth / -2,
      cameraWidth / 2,
      cameraHeight / 2,
      cameraHeight / -2,
      1,
      100
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });

    this.boundOnWindowResize = this.onWindowResize.bind(this);
    this.boundOnWindowClick = this.onWindowClick.bind(this);
    this.boundOnGameStart = this.onGameStart.bind(this);

    this.addCamera();
    this.addLights();
    this.addEventListeners();

    this.initialConfigGame();

    this.render();
    this.animate();
  }

  private addCamera(): void {
    this.camera.position.set(4, 4, 4);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.camera);
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(
      VISUAL_THEME.ambient.color,
      VISUAL_THEME.ambient.intensity
    );
    const directionalLight = new THREE.DirectionalLight(
      VISUAL_THEME.key.color,
      VISUAL_THEME.key.intensity
    );

    directionalLight.position.set(10, 20, 0);

    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }

  private addEventListeners(): void {
    this.btnPlay = this.container.querySelector<HTMLButtonElement>(
      ".tower-drop__button"
    );

    window.addEventListener("resize", this.boundOnWindowResize);
    window.addEventListener("click", this.boundOnWindowClick);

    this.btnPlay?.addEventListener("click", this.boundOnGameStart);
  }

  private addBlock({ coords, sizes, direction }: AddBlockArgs): void {
    const { blocks } = this.gameState;

    const y = coords.y ?? sizes.height * blocks.length;

    const block = this.createBlock({
      coords: {
        x: coords.x!,
        y: y,
        z: coords.z!,
      },
      sizes: sizes,
      isBlockFalling: false,
    });

    block.direction = direction;

    blocks.push(block);
  }

  private addFallBlock({ coords, sizes }: AddFallBlockArgs): void {
    const { blocks, fallBlocks } = this.gameState;

    const y = coords.y ?? this.blockSizes.height * (blocks.length - 1);

    const fallBlock = this.createBlock({
      coords: {
        x: coords.x!,
        y: y,
        z: coords.z!,
      },
      sizes: sizes,
      isBlockFalling: true,
    });

    fallBlocks.push(fallBlock);
  }

  private configWorld(): void {
    this.world.gravity.set(0, -10, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 40;
  }

  private initialConfigGame(): void {
    this.clearFeedback();
    const { blocks, fallBlocks } = this.gameState;

    const allBlocks: Block[] = blocks.concat(fallBlocks);

    for (const block of allBlocks) {
      const mesh = block.mesh;

      releaseBlockOutline(mesh);
      mesh.geometry.dispose();

      const material = mesh.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (material) {
        if (Array.isArray(material)) {
          material.forEach((mat) => {
            if ("dispose" in mat && typeof mat.dispose === "function") {
              mat.dispose();
            }
          });
        } else {
          if ("dispose" in material && typeof material.dispose === "function") {
            material.dispose();
          }
        }
      }

      this.scene.remove(mesh);

      this.world.remove(block.body);
    }

    this.gameState.blocks = [];
    this.gameState.fallBlocks = [];
    this.gameState.isMovingForward = false;

    this.addBlock({
      coords: { x: 0, z: 0 },
      sizes: { ...this.blockSizes },
      direction: "z",
    });
    this.addBlock({
      coords: { x: -10, z: 0 },
      sizes: { ...this.blockSizes },
      direction: "x",
    });

    this.camera.position.y = 4;
    this.camera.updateProjectionMatrix();

    this.configWorld();
  }

  private render(): void {
    if (performance.now() >= this.feedbackUntil) this.clearFeedback();
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    const aspect = this.sizes.width / this.sizes.height;
    const cameraWidth = 15;
    const cameraHeight = cameraWidth / aspect;

    this.camera.left = cameraWidth / -2;
    this.camera.right = cameraWidth / 2;
    this.camera.top = cameraHeight / 2;
    this.camera.bottom = cameraHeight / -2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowClick(e: Event): void {
    const score =
      this.container.querySelector<HTMLHeadingElement>(".tower-drop__score");
    const menu =
      this.container.querySelector<HTMLDivElement>(".tower-drop__menu");
    const lastScore = this.container.querySelector<HTMLHeadingElement>(
      ".tower-drop__last-score"
    );
    const { blocks, gameStarted } = this.gameState;

    const target = e.target as HTMLElement;
    const isControl =
      target instanceof Element &&
      target.closest("button, select, input, label, a, [data-game-control]");
    if (!gameStarted || isControl) return;

    const topBlock = blocks[blocks.length - 1];
    const bottomBlock = blocks[blocks.length - 2];

    if (!topBlock || !bottomBlock) return;

    const direction = topBlock.direction!;

    let delta =
      topBlock.mesh.position[direction] - bottomBlock.mesh.position[direction];
    const perfect =
      Math.abs(delta) <= GAME_CONFIG[this.snapshot.difficulty].perfectTolerance;
    if (perfect) {
      topBlock.mesh.position[direction] = bottomBlock.mesh.position[direction];
      topBlock.body.position[direction] = bottomBlock.body.position[direction];
      delta = 0;
    }
    const absDelta = Math.abs(delta);

    const size =
      direction === "x" ? topBlock.sizes.width : topBlock.sizes.depth;

    const overlap = size! - absDelta;

    if (overlap <= 0) {
      this.stopAnimation();

      if (lastScore && score) {
        lastScore.innerHTML = `Last Score: ${this.snapshot.score}`;
        score.innerHTML = "0";
        score.style.display = "none";
      }
      if (menu) {
        menu.style.display = "flex";
      }

      this.gameState.gameStarted = false;
      this.snapshot.phase = "ended";
      this.snapshot.lastResult = "miss";
      this.snapshot.perfectStreak = 0;
      this.publishState();
      return;
    }

    this.gameState.isMovingForward = false;
    this.snapshot.perfectStreak = perfect ? this.snapshot.perfectStreak + 1 : 0;
    this.snapshot.score += perfect
      ? Math.min(this.snapshot.perfectStreak, 5)
      : 1;
    this.snapshot.layers += 1;
    this.snapshot.lastResult = perfect ? "perfect" : "normal";
    if (score) score.textContent = String(this.snapshot.score);
    this.container.dispatchEvent(
      new CustomEvent<LandedDetail>(LANDED_EVENT, {
        detail: { perfect, index: blocks.length - 1 },
      })
    );
    this.publishState();

    const newBlockWidth = direction === "x" ? overlap : topBlock.sizes.width;
    const newBlockDepth = direction === "z" ? overlap : topBlock.sizes.depth;

    topBlock.sizes.width = newBlockWidth;
    topBlock.sizes.depth = newBlockDepth!;

    topBlock.mesh.scale[direction] = overlap / size!;
    topBlock.mesh.position[direction] -= delta / 2;
    topBlock.body.position[direction] -= delta / 2;

    const shape = new CANNON.Box(
      new CANNON.Vec3(
        newBlockWidth / 2,
        this.blockSizes.height / 2,
        newBlockDepth! / 2
      )
    );

    topBlock.body.shapes = [];
    topBlock.body.addShape(shape);

    const fallBlock = (overlap / 2 + absDelta / 2) * Math.sign(delta);
    const fallBlockX =
      direction === "x"
        ? topBlock.mesh.position.x + fallBlock
        : topBlock.mesh.position.x;
    const fallBlockZ =
      direction === "z"
        ? topBlock.mesh.position.z + fallBlock
        : topBlock.mesh.position.z;

    const fallBlockWidth = direction === "x" ? absDelta : newBlockWidth;
    const fallBlockDepth = direction === "z" ? absDelta : newBlockDepth;

    if (absDelta > 0)
      this.addFallBlock({
        coords: { x: fallBlockX, z: fallBlockZ },
        sizes: {
          width: fallBlockWidth,
          height: this.blockSizes.height,
          depth: fallBlockDepth!,
        },
      });

    const newBlockX = direction === "x" ? topBlock.mesh.position.x : -10;
    const newBlockZ = direction === "z" ? topBlock.mesh.position.z : -10;

    const newBlockDirection = direction === "x" ? "z" : "x";

    this.addBlock({
      coords: { x: newBlockX, z: newBlockZ },
      sizes: {
        height: this.blockSizes.height,
        width: newBlockWidth,
        depth: newBlockDepth!,
      },
      direction: newBlockDirection,
    });
  }

  private onGameStart(): void {
    const score =
      this.container.querySelector<HTMLHeadingElement>(".tower-drop__score");
    const menu =
      this.container.querySelector<HTMLDivElement>(".tower-drop__menu");

    const { gameStarted } = this.gameState;

    if (gameStarted) return;

    this.initialConfigGame();
    this.snapshot = {
      ...this.snapshot,
      phase: "playing",
      score: 0,
      layers: 0,
      perfectStreak: 0,
      lastResult: "none",
    };
    if (score) score.textContent = "0";

    if (score) {
      score.style.display = "block";
      score.style.color = "#ffffff";
    }

    if (menu) {
      menu.style.display = "none";
    }

    this.startAnimation();
    this.gameState.gameStarted = true;
    this.publishState();
  }

  private createBlock({
    coords,
    sizes,
    isBlockFalling,
  }: CreateBlockArgs): Block {
    const { blocks } = this.gameState;
    const { x, y, z } = coords;

    const geometry = new THREE.BoxGeometry(
      sizes.width,
      sizes.height,
      sizes.depth
    );

    const material = createBlockMaterial(
      isBlockFalling ? blocks.length - 1 : blocks.length
    );

    const mesh = new THREE.Mesh(geometry, material);
    addBlockOutline(mesh);
    mesh.position.set(x!, y!, z!);
    this.scene.add(mesh);

    const shape = new CANNON.Box(
      new CANNON.Vec3(sizes.width / 2, sizes.height / 2, sizes.depth! / 2)
    );
    const mass = isBlockFalling ? 5 : 0;
    const body = new CANNON.Body({ mass: mass, shape: shape });
    body.position.set(x!, y!, z!);
    this.world.addBody(body);

    const block: Block = {
      mesh: mesh,
      body: body,
      sizes: sizes,
    };

    return block;
  }

  private updatePhysics(): void {
    const { fallBlocks } = this.gameState;

    this.world.step(1 / 60);

    fallBlocks.forEach((block) => {
      block.mesh.position.copy(block.body.position);
      block.mesh.quaternion.copy(block.body.quaternion);
    });
  }

  private animate(): void {
    if (!this.isAnimating) return;

    const { blocks, isMovingForward } = this.gameState;

    const topBlock = blocks[blocks.length - 1];
    const bottomBlock = blocks[blocks.length - 2];

    if (!topBlock || !bottomBlock) return;

    const direction = topBlock.direction!;

    const delta = Math.round(
      topBlock.mesh.position[direction] - bottomBlock.mesh.position[direction]
    );

    if (isMovingForward) {
      topBlock.mesh.position[topBlock.direction!] -= this.blockSpeed;
      topBlock.body.position[topBlock.direction!] -= this.blockSpeed;
      if (delta === -5) this.gameState.isMovingForward = false;
    }

    if (!isMovingForward) {
      topBlock.mesh.position[topBlock.direction!] += this.blockSpeed;
      topBlock.body.position[topBlock.direction!] += this.blockSpeed;
      if (delta === 5) this.gameState.isMovingForward = true;
    }

    if (
      this.camera.position.y <
      this.blockSizes.height * (blocks.length - 2) + 4
    ) {
      this.camera.position.y += this.blockSpeed;
    }

    this.updatePhysics();
    this.render();

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private startAnimation(): void {
    this.isAnimating = true;
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private stopAnimation(): void {
    this.isAnimating = false;
    this.renderer.setAnimationLoop(null);
  }

  public dispose(): void {
    this.atmosphere.dispose();
    this.container.removeEventListener(LANDED_EVENT, this.onLanded);
    this.container.removeEventListener(STATE_EVENT, this.onRoundState);
    this.clearFeedback();
    this.stopAnimation();

    window.removeEventListener("resize", this.boundOnWindowResize);
    window.removeEventListener("click", this.boundOnWindowClick);

    if (this.btnPlay) {
      this.btnPlay.removeEventListener("click", this.boundOnGameStart);
    }

    const { blocks, fallBlocks } = this.gameState;
    const allBlocks = blocks.concat(fallBlocks);

    for (const block of allBlocks) {
      releaseBlockOutline(block.mesh);
      block.mesh.geometry.dispose();

      const material = block.mesh.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (material) {
        if (Array.isArray(material)) {
          material.forEach((mat) => {
            if ("dispose" in mat && typeof mat.dispose === "function") {
              mat.dispose();
            }
          });
        } else {
          if ("dispose" in material && typeof material.dispose === "function") {
            material.dispose();
          }
        }
      }

      this.scene.remove(block.mesh);

      this.world.remove(block.body);
    }

    this.renderer.dispose();

    this.scene.clear();

    this.gameState.blocks = [];
    this.gameState.fallBlocks = [];
  }
}

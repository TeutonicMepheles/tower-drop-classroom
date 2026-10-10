import * as THREE from "three";
import * as CANNON from "cannon";

import type { Page } from "@/types/pages";

import { TowerDrop } from "@/core/TowerDrop";

const createContainer = (): Page => {
  const main = document.createElement("main") as Page;
  main.innerHTML = `
    <canvas class="tower-drop__webgl"></canvas>
    <div class="tower-drop__container" id="mainContainer">
      <p class="tower-drop__score">0</p>
      <div class="tower-drop__menu" style="display: flex">
        <div class="tower-drop__menu-wrapper">
          <h1 class="tower-drop__title">Tower Drop</h1>
          <h2 class="tower-drop__last-score">Last Score: 0</h2>
          <button class="tower-drop__button" id="playbtn">隆Play!</button>
        </div>
      </div>
    </div>
  `;
  return main;
};

describe("TowerDrop", () => {
  let canvas: HTMLCanvasElement;
  let container: Page;
  let game: TowerDrop;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    container = createContainer();
    document.body.appendChild(container);
    game = new TowerDrop(canvas, container);
  });

  afterEach(() => {
    game.dispose();
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a Three.js scene", () => {
      expect(THREE.Scene).toHaveBeenCalledTimes(1);
    });

    it("should create an orthographic camera", () => {
      expect(THREE.OrthographicCamera).toHaveBeenCalledTimes(1);
    });

    it("should create a WebGL renderer with the provided canvas", () => {
      expect(THREE.WebGLRenderer).toHaveBeenCalledWith({
        canvas,
        antialias: true,
        alpha: true,
      });
    });

    it("should create a Cannon.js physics world", () => {
      expect(CANNON.World).toHaveBeenCalledTimes(1);
    });

    it("should expose the canvas as a public property", () => {
      expect(game.canvas).toBe(canvas);
    });

    it("should add ambient and directional lights to the scene", () => {
      expect(THREE.AmbientLight).toHaveBeenCalledTimes(1);
      expect(THREE.DirectionalLight).toHaveBeenCalledTimes(1);
    });

    it("should create the two initial base blocks", () => {
      expect(THREE.Mesh).toHaveBeenCalledTimes(2);
    });
  });

  describe("dispose", () => {
    it("should remove the resize event listener from window", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
      game.dispose();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );
    });

    it("should stop the animation loop", () => {
      const rendererInstance = (THREE.WebGLRenderer as jest.Mock).mock
        .results[0]!.value;
      game.dispose();
      expect(rendererInstance.setAnimationLoop).toHaveBeenCalledWith(null);
    });

    it("should call dispose on the WebGL renderer", () => {
      const rendererInstance = (THREE.WebGLRenderer as jest.Mock).mock
        .results[0]!.value;
      game.dispose();
      expect(rendererInstance.dispose).toHaveBeenCalled();
    });

    it("should clear the Three.js scene", () => {
      const sceneInstance = (THREE.Scene as unknown as jest.Mock).mock
        .results[0]!.value;
      game.dispose();
      expect(sceneInstance.clear).toHaveBeenCalled();
    });

    it("should remove all block bodies from the physics world", () => {
      const worldInstance = (CANNON.World as jest.Mock).mock.results[0]!.value;
      game.dispose();
      expect(worldInstance.remove).toHaveBeenCalled();
    });
  });

  describe("onWindowResize", () => {
    it("should update the renderer size on window resize", () => {
      const rendererInstance = (THREE.WebGLRenderer as jest.Mock).mock
        .results[0]!.value;
      rendererInstance.setSize.mockClear();
      window.dispatchEvent(new UIEvent("resize"));
      expect(rendererInstance.setSize).toHaveBeenCalledTimes(1);
    });

    it("should update the camera projection matrix on window resize", () => {
      const cameraInstance = (THREE.OrthographicCamera as unknown as jest.Mock)
        .mock.results[0]!.value;
      cameraInstance.updateProjectionMatrix.mockClear();
      window.dispatchEvent(new UIEvent("resize"));
      expect(cameraInstance.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    });

    it("should re-render the scene on window resize", () => {
      const rendererInstance = (THREE.WebGLRenderer as jest.Mock).mock
        .results[0]!.value;
      rendererInstance.render.mockClear();
      window.dispatchEvent(new UIEvent("resize"));
      expect(rendererInstance.render).toHaveBeenCalledTimes(1);
    });
  });
});

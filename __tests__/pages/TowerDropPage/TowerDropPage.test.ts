import { screen } from "@testing-library/dom";
import * as THREE from "three";

import type { Page } from "@/types/pages";

import TowerDropPage from "@/pages/TowerDropPage/TowerDropPage";

let page: Page | undefined;

const renderPage = (): Page => {
  page = TowerDropPage();
  document.body.appendChild(page);
  return page;
};

describe("TowerDropPage", () => {
  it("shows round statistics and resets the summary on restart", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    renderPage();
    screen.getByRole("button", { name: /开始游戏|再玩一次/ }).click();
    for (let i = 0; i < 5; i++) window.dispatchEvent(new MouseEvent("click"));
    screen.getByRole("button", { name: /从容节奏/ }).click();
    const moving = (THREE.Mesh as unknown as jest.Mock).mock.results.at(-1)!
      .value as THREE.Mesh;
    moving.position.x = moving.position.z = 4;
    window.dispatchEvent(new MouseEvent("click"));
    expect(document.querySelector(".run-summary")).toBeVisible();
    expect(document.querySelector(".run-summary")).toHaveTextContent(
      "完美 5 次"
    );
    expect(document.querySelector(".run-summary")).toHaveTextContent(
      "最长连击 5"
    );
    screen.getByRole("button", { name: /开始游戏|再玩一次/ }).click();
    expect(document.querySelector(".run-summary")).not.toBeVisible();
    expect(document.querySelector(".run-bonuses")).toHaveTextContent(
      "暂无加成"
    );
  });
  it("shows three reward cards after five landings and resumes without an extra drop", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    renderPage();
    screen.getByRole("button", { name: /开始游戏|再玩一次/ }).click();
    for (let i = 0; i < 5; i++) window.dispatchEvent(new MouseEvent("click"));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    const moving = (THREE.Mesh as unknown as jest.Mock).mock.results.at(-1)!
      .value as THREE.Mesh;
    const before = {
      x: moving.position.x,
      y: moving.position.y,
      z: moving.position.z,
    };
    const renderer = (
      THREE.WebGLRenderer as unknown as jest.Mock
    ).mock.results.at(-1)!.value as { setAnimationLoop: jest.Mock };
    expect(renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(moving.position).toMatchObject(before);
    screen.getByRole("button", { name: /从容节奏/ }).click();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector(".gameplay-status")).toHaveTextContent(
      "5 层"
    );
    expect(document.querySelector(".gameplay-status")).toHaveTextContent(
      "减速 1/3"
    );
    expect(renderer.setAnimationLoop).toHaveBeenLastCalledWith(
      expect.any(Function)
    );
  });
  afterEach(() => {
    page?.cleanup?.();
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render a main element with the tower-drop-page class", () => {
      renderPage();
      expect(screen.getByRole("main")).toHaveClass("tower-drop-page");
    });

    it("should render the webgl canvas element", () => {
      renderPage();
      expect(
        document.querySelector<HTMLCanvasElement>(".tower-drop__webgl")
      ).toBeInTheDocument();
    });

    it("should render the score element with an initial value of 0", () => {
      renderPage();
      const score =
        document.querySelector<HTMLParagraphElement>(".tower-drop__score");
      expect(score).toBeInTheDocument();
      expect(score).toHaveTextContent("0");
    });

    it("should render the menu container", () => {
      renderPage();
      expect(
        document.querySelector<HTMLDivElement>(".tower-drop__menu")
      ).toBeInTheDocument();
    });

    it("should render the game title", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "Tower Drop", level: 1 })
      ).toBeInTheDocument();
    });

    it("should render the last score heading with initial value", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: /准备好挑战了吗/i, level: 2 })
      ).toBeInTheDocument();
    });

    it("should render the play button", () => {
      renderPage();
      expect(
        screen.getByRole("button", { name: "开始游戏" })
      ).toBeInTheDocument();
    });

    it("should render the play button with the correct id", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "开始游戏" })).toHaveAttribute(
        "id",
        "playbtn"
      );
    });

    it("should render the play button inside the menu wrapper", () => {
      renderPage();
      const wrapper = document.querySelector<HTMLDivElement>(
        ".tower-drop__menu-wrapper"
      );
      expect(
        wrapper?.querySelector<HTMLButtonElement>("#playbtn")
      ).toBeInTheDocument();
    });
  });

  describe("cleanup", () => {
    it("should expose a cleanup method", () => {
      const page = renderPage();
      expect(typeof page.cleanup).toBe("function");
    });

    it("should not throw when cleanup is called", () => {
      const page = renderPage();
      expect(() => {
        page.cleanup!();
      }).not.toThrow();
    });
  });
});

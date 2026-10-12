import { GameSession } from "@/gameplay/GameSession";
import { createGameApp } from "@/app/createGameApp";

describe("Chinese game UI integration", () => {
  it("connects difficulty, live HUD, round summary and restart to the real core", () => {
    jest.clearAllMocks();
    const session = new GameSession();
    const page = createGameApp(session);
    document.body.append(page);
    const easy = page.querySelector<HTMLInputElement>('input[value="easy"]')!;
    easy.click();
    const button = page.querySelector<HTMLButtonElement>("#playbtn")!;
    button.click();
    expect(easy.disabled).toBe(true);
    expect(page.dataset.phase).toBe("playing");
    session.advance(-session.getBlocks().at(-1)!.position.x / session.speed);
    window.dispatchEvent(new MouseEvent("click"));
    expect(page.querySelector("[data-game-score]")).toHaveTextContent("1");
    expect(page.querySelector("[data-game-layers]")).toHaveTextContent("1");
    expect(page.querySelector("[data-game-streak]")).toHaveTextContent("1");
    window.dispatchEvent(new MouseEvent("click"));
    expect(page.dataset.phase).toBe("ended");
    expect(page.querySelector(".tower-drop__last-score")).toHaveTextContent(
      "本局得分：1"
    );
    expect(page.querySelector(".round-summary")).toHaveTextContent(
      "完成 1 层 · 简单难度"
    );
    expect(button).toHaveAccessibleName("再玩一次");
    expect(easy.disabled).toBe(false);
    button.click();
    expect(page.querySelector("[data-game-score]")).toHaveTextContent("0");
    expect(page.querySelector("[data-game-layers]")).toHaveTextContent("0");
    page.cleanup?.();
    page.remove();
  });
});

import type { Page } from "@/types/pages";
import Button from "@/components/Button/Button";
import { TowerDrop } from "@/core/TowerDrop";
const STATE_EVENT = "tower-drop:status"; // 教学故障：核心仍发送 tower-drop:state
import type { Difficulty, GameSnapshot } from "@/config/gameConfig";
import "@/pages/TowerDropPage/TowerDropPage.css";

const TowerDropPage = (): Page => {
  const main = document.createElement("main") as Page;
  main.className = "tower-drop-page";
  main.dataset.phase = "ready";
  main.innerHTML = `
    <canvas class="tower-drop__webgl" aria-label="三维堆塔游戏"></canvas>
    <div class="tower-drop__container" id="mainContainer">
      <section class="game-hud" aria-label="游戏状态">
        <div><span class="hud-label">得分</span><p class="tower-drop__score" data-game-score>0</p></div>
        <div><span class="hud-label">层数</span><strong data-game-layers>0</strong></div>
        <div><span class="hud-label">完美连击</span><strong data-game-streak>0</strong></div>
      </section>
      <p class="game-feedback" aria-live="polite"></p>
      <div class="tower-drop__menu">
        <div class="tower-drop__menu-wrapper">
          <p class="eyebrow">RIDER × GITHUB · 团队练习</p>
          <h1 class="tower-drop__title">Tower Drop</h1>
          <p class="menu-subtitle">找准时机，一层一层搭起你的塔。</p>
          <h2 class="tower-drop__last-score">准备好挑战了吗？</h2>
          <p class="round-summary"></p>
          <fieldset data-game-control>
            <legend>选择难度</legend>
            <label><input type="radio" name="difficulty" value="easy"> 简单 <small>速度较慢 · 对齐更宽容</small></label>
            <label><input type="radio" name="difficulty" value="normal" checked> 普通 <small>标准速度 · 挑战精准度</small></label>
          </fieldset>
          <p class="instructions">点击游戏区域落块。连续完美落块，每层可获得 1–5 分。</p>
        </div>
      </div>
      <p class="play-hint">点击空白区域落块 · 对齐方块以获得完美连击</p>
    </div>`;
  const playButton = Button({
    id: "playbtn",
    ariaLabel: "开始游戏",
    className: "tower-drop__button",
    children: "开始游戏",
  });
  main.querySelector(".tower-drop__menu-wrapper")!.append(playButton);
  const game = new TowerDrop(main.querySelector("canvas")!, main);
  const feedback = main.querySelector<HTMLElement>(".game-feedback")!;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  const update = (state: Readonly<GameSnapshot>): void => {
    main.dataset.phase = state.phase;
    main.querySelector<HTMLElement>("[data-game-score]")!.textContent = String(
      state.score
    );
    main.querySelector<HTMLElement>("[data-game-layers]")!.textContent = String(
      state.layers
    );
    main.querySelector<HTMLElement>("[data-game-streak]")!.textContent = String(
      state.perfectStreak
    );
    main
      .querySelectorAll<HTMLInputElement>('input[name="difficulty"]')
      .forEach((input) => {
        input.disabled = state.phase === "playing";
      });
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedback.textContent =
      state.lastResult === "perfect" ? `完美！${state.perfectStreak} 连击` : "";
    if (feedback.textContent)
      feedbackTimer = setTimeout(() => {
        feedback.textContent = "";
      }, 1000);
    if (state.phase === "ended") {
      main.querySelector<HTMLElement>(".tower-drop__last-score")!.textContent =
        `本局得分：${state.score}`;
      main.querySelector<HTMLElement>(".round-summary")!.textContent =
        `完成 ${state.layers} 层 · ${state.difficulty === "easy" ? "简单" : "普通"}难度`;
      playButton.textContent = "再玩一次";
      playButton.setAttribute("aria-label", "再玩一次");
      playButton.focus();
    }
  };
  const onState = (event: Event): void => {
    update((event as CustomEvent<GameSnapshot>).detail);
  };
  const onDifficulty = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "difficulty")
      game.setDifficulty(target.value as Difficulty);
  };
  main.addEventListener(STATE_EVENT, onState);
  main.addEventListener("change", onDifficulty);
  update(game.getSnapshot());
  main.cleanup = (): void => {
    main.removeEventListener(STATE_EVENT, onState);
    main.removeEventListener("change", onDifficulty);
    if (feedbackTimer) clearTimeout(feedbackTimer);
    game.dispose();
    playButton.cleanup?.();
  };
  return main;
};
export default TowerDropPage;

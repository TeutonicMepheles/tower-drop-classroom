import type { Page } from "@/types/pages";
import Button from "@/components/Button/Button";
import { TowerDrop } from "@/core/TowerDrop";
import { REWARDS } from "@/config/rewards";
import type { RewardId } from "@/config/rewards";
import { STATE_EVENT } from "@/config/gameConfig";
import type { Difficulty, GameSnapshot } from "@/config/gameConfig";
import "@/pages/TowerDropPage/TowerDropPage.css";

const TowerDropPage = (): Page => {
  const main = document.createElement("main") as Page;
  main.className = "tower-drop-page";
  main.dataset.phase = "ready";
  main.innerHTML = `
    <canvas class="tower-drop__webgl" aria-label="三维堆塔游戏" tabindex="-1"></canvas>
    <div class="tower-drop__container" id="mainContainer">
      <section class="game-hud" aria-label="游戏状态">
        <div><span class="hud-label">得分</span><p class="tower-drop__score" data-game-score>0</p></div>
        <div><span class="hud-label">层数</span><strong data-game-layers>0</strong></div>
        <div><span class="hud-label">完美连击</span><strong data-game-streak>0</strong></div>
      </section>
      <p class="game-feedback" aria-live="polite"></p>
      <p class="gameplay-status" aria-live="polite"></p><aside class="run-progress"><p class="run-record"></p><p class="run-bonuses"></p><p class="run-feedback"></p></aside>
        <section class="reward-panel" role="dialog" aria-modal="true" aria-labelledby="reward-title" data-game-control hidden>
          <div class="reward-panel__content"><h2 id="reward-title">选择本局加成</h2><p>游戏已暂停。选择一个奖励后继续堆叠。</p><div class="reward-cards"></div></div>
        </section>

      <div class="tower-drop__menu">
        <div class="tower-drop__menu-wrapper">
          <p class="eyebrow">RIDER × GITHUB · 团队练习</p>
          <h1 class="tower-drop__title">Tower Drop</h1>
          <p class="menu-subtitle">找准时机，一层一层搭起你的塔。</p>
          <h2 class="tower-drop__last-score">准备好挑战了吗？</h2>
          <p class="round-summary"></p><div class="run-summary" hidden></div>
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
  const canvas = main.querySelector<HTMLCanvasElement>("canvas")!;
  const status = main.querySelector<HTMLElement>(".gameplay-status")!;
  const rewardPanel = main.querySelector<HTMLElement>(".reward-panel")!;
  const cards = main.querySelector<HTMLElement>(".reward-cards")!;
  const record = main.querySelector<HTMLElement>(".run-record")!;
  const bonuses = main.querySelector<HTMLElement>(".run-bonuses")!;
  const runFeedback = main.querySelector<HTMLElement>(".run-feedback")!;
  const summary = main.querySelector<HTMLElement>(".run-summary")!;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  const update = (state: Readonly<GameSnapshot>): void => {
    main.dataset.phase = state.phase;
    const phaseLabel = {
      ready: "准备开始",
      playing: "堆叠中",
      reward: "选择奖励",
      ended: "本局结束",
    }[state.phase];
    status.textContent = `${phaseLabel} · ${state.layers} 层 · 连击 ${state.perfectStreak}${state.lastResult === "perfect" ? " · 完美拼接！" : ""} · 减速 ${state.rewards.slow}/3 · 精准 ${state.rewards.precision}/3`;
    record.textContent = `${state.difficulty === "easy" ? "简单" : "普通"}纪录 ${state.bestLayers} 层 · 本局 ${state.layers} 层${state.recordBroken ? " · 已刷新纪录！" : ""}`;
    const acquired = (Object.keys(REWARDS) as RewardId[]).filter(
      (id) => state.rewards[id] > 0
    );
    bonuses.textContent = `护盾 ${state.shields}/2 · ${acquired.length ? acquired.map((id) => `${REWARDS[id].title} ×${state.rewards[id]}`).join(" · ") : "暂无加成"}`;
    runFeedback.textContent =
      state.lastResult === "rescue"
        ? "护盾已救援！本层重新挑战，连击清零。"
        : state.phase === "reward"
          ? "达到奖励层，选择后继续。"
          : state.phase === "ended"
            ? "本局已结束，开始新一局挑战纪录。"
            : state.phase === "ready"
              ? "选择难度，开始堆叠。"
              : `再堆叠 ${state.layersUntilReward} 层可获得可用奖励`;
    summary.hidden = state.phase !== "ended";
    summary.textContent = `本局 ${state.layers} 层 · 得分 ${state.score} · 完美 ${state.perfectCount} 次 · 最长连击 ${state.longestStreak} · 救援 ${state.rescuesUsed} 次${state.recordBroken ? " · 新纪录！" : ""}`;
    const wasReward = !rewardPanel.hidden;
    rewardPanel.hidden = state.phase !== "reward";
    if (state.phase === "reward") {
      cards.replaceChildren(
        ...state.rewardChoices.map((id) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.reward = id;
          const title = document.createElement("strong");
          title.textContent = REWARDS[id].title;
          const description = document.createElement("span");
          description.textContent = REWARDS[id].description;
          button.append(title, description);
          return button;
        })
      );
      cards.querySelector("button")?.focus();
    } else if (wasReward) canvas.focus();

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
        input.disabled = state.phase === "playing" || state.phase === "reward";
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
  const onReward = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "button[data-reward]"
    );
    if (button) game.chooseReward(button.dataset.reward as RewardId);
  };
  const onRewardKey = (event: KeyboardEvent): void => {
    if (event.key !== "Tab" || rewardPanel.hidden) return;
    const buttons = Array.from(cards.querySelectorAll("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();
    buttons[
      (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ]?.focus();
  };
  cards.addEventListener("click", onReward);
  rewardPanel.addEventListener("keydown", onRewardKey);

  main.addEventListener(STATE_EVENT, onState);
  main.addEventListener("change", onDifficulty);
  update(game.getSnapshot());
  main.cleanup = (): void => {
    main.removeEventListener(STATE_EVENT, onState);
    main.removeEventListener("change", onDifficulty);
    if (feedbackTimer) clearTimeout(feedbackTimer);
    cards.removeEventListener("click", onReward);
    rewardPanel.removeEventListener("keydown", onRewardKey);
    game.dispose();
    playButton.cleanup?.();
  };
  return main;
};
export default TowerDropPage;

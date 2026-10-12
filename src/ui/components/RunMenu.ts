import type { Difficulty, GameSnapshot } from "@/contracts/game";
import { icon } from "@/ui/assets/icons";
import { find, setText } from "./primitives";
import type { View } from "./primitives";
export const createRunMenu = (
  start: () => void,
  setDifficulty: (value: Difficulty) => void
): View<GameSnapshot> => {
  const element = document.createElement("section");
  element.className = "tower-drop__menu";
  element.dataset.gameControl = "";
  element.innerHTML = `<div class="tower-drop__menu-wrapper">
    <div class="menu-intro"><h1>Tower Drop</h1><p class="panel-subtitle">点击落块，尽量对齐。</p><div class="menu-stack" aria-hidden="true"><i></i><i></i><i></i></div><h2 class="sr-only">游戏开始菜单</h2></div>
    <div class="run-summary" hidden><span class="section-kicker" data-result-label>本局结束</span><h2 class="result-title">本局层数</h2><div class="result-height"><strong data-result-layers>0</strong><span>层</span></div><p class="round-summary sr-only"></p><p class="tower-drop__last-score"></p><div class="result-record">${icon("trophy")}<span data-result-record></span></div><div class="result-stats"><div>${icon("spark")}<span>完美 <strong data-perfect>0</strong> 次</span></div><div>${icon("tower")}<span>最长连击 <strong data-streak>0</strong></span></div><div>${icon("shield")}<span>护盾救援 <strong data-rescues>0</strong> 次</span></div></div></div>
    <fieldset class="difficulty-picker"><legend>难度</legend><label><input type="radio" name="difficulty" value="easy"><span>简单<small>移动较慢，容易对齐</small></span></label><label><input type="radio" name="difficulty" value="normal" checked><span>普通<small>标准难度</small></span></label></fieldset>
    <button type="button" id="playbtn" class="tower-drop__button" aria-label="开始游戏"><span data-button-label>开始游戏</span>${icon("arrow")}</button><p class="menu-instruction">长按方块选择技能，每五层可选补给</p></div>`;
  const play = find(element, "#playbtn");
  const onDifficulty = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "difficulty")
      setDifficulty(target.value as Difficulty);
  };
  play.addEventListener("click", start);
  element.addEventListener("change", onDifficulty);
  let previous: GameSnapshot["phase"] | undefined;
  let completedRun: Readonly<GameSnapshot> | undefined;
  return {
    element,
    update: (state): void => {
      const ended = state.phase === "ended";
      // Difficulty selection configures the next run; it must not relabel this result.
      if (ended && previous !== "ended") completedRun = { ...state };
      if (!ended) completedRun = undefined;
      const result = completedRun ?? state;
      element.hidden = state.phase !== "ready" && !ended;
      element.style.display = element.hidden ? "none" : "flex";
      element.dataset.ended = String(ended);
      find(element, ".menu-intro").hidden = ended;
      find(element, ".run-summary").hidden = !ended;
      setText(element, "[data-result-layers]", result.layers);
      setText(element, ".tower-drop__last-score", `本局得分：${result.score}`);
      setText(
        element,
        ".round-summary",
        `完成 ${result.layers} 层 · ${result.difficulty === "easy" ? "简单" : "普通"}难度`
      );
      setText(
        element,
        "[data-result-label]",
        result.recordBroken ? "新纪录！" : "本局结束"
      );
      setText(
        element,
        "[data-result-record]",
        `${result.difficulty === "easy" ? "简单" : "普通"}最佳 ${result.bestLayers} 层`
      );
      find(element, ".result-record").dataset.new = String(result.recordBroken);
      setText(element, "[data-perfect]", result.perfectCount);
      setText(element, "[data-streak]", result.longestStreak);
      setText(element, "[data-rescues]", result.rescuesUsed);
      element
        .querySelectorAll<HTMLInputElement>('input[name="difficulty"]')
        .forEach((input) => {
          input.checked = input.value === state.difficulty;
          input.disabled = element.hidden;
        });
      const label = ended ? "再玩一次" : "开始游戏";
      setText(element, "[data-button-label]", label);
      play.setAttribute("aria-label", label);
      if (ended && previous !== "ended") play.focus();
      previous = state.phase;
    },
    dispose: (): void => {
      play.removeEventListener("click", start);
      element.removeEventListener("change", onDifficulty);
    },
  };
};

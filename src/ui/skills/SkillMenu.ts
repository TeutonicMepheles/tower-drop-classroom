import type { GameCommands, GameSnapshot, SkillId } from "@/contracts/game";
const SKILLS = {
  magnet: {
    title: "磁力对齐",
    description: "靠近塔顶时吸附，立即完美放置",
    charges: "magnetCharges",
    available: "canUseMagnet",
  },
  repair: {
    title: "紧急修复",
    description: "宽、深各恢复 0.6，最多至初始尺寸",
    charges: "repairCharges",
    available: "canUseRepair",
  },
  freeze: {
    title: "定格",
    description: "当前块停住 1 秒，再次短按落块",
    charges: "freezeCharges",
    available: "canUseFreeze",
  },
} as const;
const ids: SkillId[] = ["magnet", "repair", "freeze"];
export function createSkillMenu(game: GameCommands): {
  element: HTMLElement;
  update(state: Readonly<GameSnapshot>): void;
  pointAt(x: number, y: number): SkillId | "cancel" | null;
  dispose(): void;
} {
  const element = document.createElement("div");
  element.className = "skill-controls";
  element.dataset.gameControl = "";
  element.innerHTML = `
    <p class="freeze-status" role="status" hidden></p>
    <button class="skill-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">技能 · 3/3</button>
    <section class="skill-menu" role="dialog" aria-label="子弹时间技能菜单" hidden>
      <div class="skill-menu__heading"><strong>子弹时间 · 20% 速度</strong><span class="skill-clock"></span></div>
      <progress class="skill-budget" max="2000" value="2000" aria-label="本层剩余子弹时间"></progress>
      <p class="skill-help">每层限用一个技能 · 拖到卡片松手使用，移开取消；也可点击。</p>
      <div class="skill-actions">${ids.map((id) => `<button type="button" class="skill-card" data-skill="${id}"><strong>${SKILLS[id].title} <span class="skill-count"></span></strong><span>${SKILLS[id].description}</span><small class="skill-range" aria-live="polite"></small></button>`).join("")}</div>
      <button type="button" class="skill-cancel" data-skill="cancel">取消 · Esc</button>
    </section>`;
  const trigger = element.querySelector<HTMLButtonElement>(".skill-trigger")!;
  const menu = element.querySelector<HTMLElement>(".skill-menu")!;
  const cards = ids.map(
    (id) => element.querySelector<HTMLButtonElement>(`[data-skill="${id}"]`)!
  );
  const cancel = element.querySelector<HTMLButtonElement>(".skill-cancel")!;
  const clock = element.querySelector<HTMLElement>(".skill-clock")!;
  const progress = element.querySelector<HTMLProgressElement>("progress")!;
  const frozen = element.querySelector<HTMLElement>(".freeze-status")!;
  const onOpen = (): void => {
    game.openSkillMenu();
  };
  const onAction = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLButtonElement>(
      "[data-skill]"
    );
    const id = target?.dataset.skill;
    if (id === "cancel") game.closeSkillMenu();
    else if (id === "magnet" || id === "repair" || id === "freeze")
      game.useSkill(id);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      game.closeSkillMenu();
    }
    if (event.key === "Tab" && !menu.hidden) {
      event.preventDefault();
      const targets = [...cards.filter((card) => !card.disabled), cancel];
      const index = targets.indexOf(
        document.activeElement as HTMLButtonElement
      );
      targets[
        (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length
      ]!.focus();
    }
  };
  trigger.addEventListener("click", onOpen);
  menu.addEventListener("click", onAction);
  menu.addEventListener("keydown", onKey);
  return {
    element,
    update(state): void {
      const { skills } = state;
      const wasOpen = !menu.hidden;
      const total =
        skills.magnetCharges + skills.repairCharges + skills.freezeCharges;
      element.hidden = state.phase !== "playing";
      menu.hidden = !skills.menuOpen;
      trigger.hidden = skills.menuOpen;
      trigger.disabled =
        total === 0 || skills.remainingMs <= 0 || skills.usedThisLayer;
      trigger.textContent =
        total === 0
          ? "技能已用完 · 每五层可补给"
          : skills.usedThisLayer
            ? "本层技能已使用"
            : skills.remainingMs <= 0
              ? "本层子弹时间已用完"
              : `技能 · ${total}/3`;
      trigger.title = `磁力对齐 ×${skills.magnetCharges} · 紧急修复 ×${skills.repairCharges} · 定格 ×${skills.freezeCharges}`;
      trigger.setAttribute("aria-expanded", String(skills.menuOpen));
      cards.forEach((card, index) => {
        const id = ids[index]!;
        const spec = SKILLS[id];
        const count = skills[spec.charges];
        card.disabled = !skills[spec.available];
        card.querySelector(".skill-count")!.textContent = `×${count}`;
        const hint =
          count === 0
            ? "暂无次数 · 每五层可选补给"
            : skills[spec.available]
              ? "消耗 1 次 · 可以释放"
              : id === "magnet"
                ? "距离太远 · 等方块靠近塔顶"
                : id === "repair"
                  ? "尺寸完好 · 无需修复"
                  : "本层暂不可用";
        const range = card.querySelector(".skill-range")!;
        if (range.textContent !== hint) range.textContent = hint;
      });
      frozen.hidden = skills.freezeRemainingMs <= 0;
      frozen.textContent = `定格 ${(skills.freezeRemainingMs / 1000).toFixed(1)} 秒 · 短按落块`;
      clock.textContent = (skills.remainingMs / 1000).toFixed(1) + " 秒";
      progress.value = skills.remainingMs;
      if (!wasOpen && skills.menuOpen)
        (cards.find((card) => !card.disabled) ?? cancel).focus({
          preventScroll: true,
        });
      if (wasOpen && !skills.menuOpen) {
        cards.forEach((card) => {
          card.classList.remove("is-target");
        });
        if (state.phase === "playing") {
          if (trigger.disabled)
            element
              .closest(".tower-drop-page")
              ?.querySelector<HTMLCanvasElement>("canvas")
              ?.focus({ preventScroll: true });
          else trigger.focus({ preventScroll: true });
        }
      }
    },
    pointAt(x, y): SkillId | "cancel" | null {
      const target =
        x < 0 || y < 0
          ? null
          : document
              .elementFromPoint(x, y)
              ?.closest<HTMLElement>("[data-skill]");
      const action =
        target && element.contains(target) ? target.dataset.skill : null;
      cards.forEach((card) =>
        card.classList.toggle(
          "is-target",
          action === card.dataset.skill && !card.disabled
        )
      );
      return action === "magnet" ||
        action === "repair" ||
        action === "freeze" ||
        action === "cancel"
        ? action
        : null;
    },
    dispose(): void {
      trigger.removeEventListener("click", onOpen);
      menu.removeEventListener("click", onAction);
      menu.removeEventListener("keydown", onKey);
    },
  };
}

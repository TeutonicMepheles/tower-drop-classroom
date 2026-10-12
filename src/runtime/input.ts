interface SkillInput {
  surface: HTMLElement;
  hitTest(x: number, y: number): boolean;
  open(): boolean;
  close(): void;
  use(): boolean;
  isOpen(): boolean;
  pointAt(x: number, y: number): "magnet" | "cancel" | null;
}
const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  !!target.closest("button, select, input, label, a, [data-game-control]");

export function bindInput(drop: () => void, skills?: SkillInput): () => void {
  let pointer: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let suppressClick = false;
  const clearTimer = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };
  const abort = (): void => {
    clearTimer();
    if (pointer !== undefined) suppressClick = true;
    pointer = undefined;
    held = false;
    skills?.close();
    skills?.pointAt(-1, -1);
  };
  const onDown = (event: PointerEvent): void => {
    if (!skills) return;
    if (pointer !== undefined) {
      abort();
      return;
    }
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (isControl(event.target) || event.target !== skills.surface) return;
    pointer = event.pointerId;
    held = false;
    if (skills.isOpen()) {
      held = true;
      return;
    }
    // Hit testing occurs only on press: the moving block may then leave the finger.
    if (skills.hitTest(event.clientX, event.clientY)) {
      timer = setTimeout(() => {
        held = true;
        skills.open();
      }, 300);
    }
  };
  const onMove = (event: PointerEvent): void => {
    if (pointer === event.pointerId && held && skills?.isOpen())
      skills.pointAt(event.clientX, event.clientY);
  };
  const onUp = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    clearTimer();
    pointer = undefined;
    suppressClick = true;
    if (held) {
      if (
        skills?.isOpen() &&
        skills.pointAt(event.clientX, event.clientY) === "magnet"
      )
        skills.use();
      skills?.close();
      skills?.pointAt(-1, -1);
    } else if (!isControl(event.target)) drop();
    held = false;
  };
  const onClick = (event: Event): void => {
    // A pointer gesture already handled its release. Swallow its synthesized click,
    // including one that lands on a reward button revealed by the skill.
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (isControl(event.target)) return;
    if (skills?.isOpen()) {
      skills.close();
      return;
    }
    drop();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") abort();
  };
  const onVisibility = (): void => {
    if (document.hidden) abort();
  };
  window.addEventListener("click", onClick, true);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", abort);
  window.addEventListener("blur", abort);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    abort();
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", abort);
    window.removeEventListener("blur", abort);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

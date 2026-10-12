import type { GameSnapshot } from "@/contracts/game";
import { icon } from "@/ui/assets/icons";
import { feedbackMessage } from "@/ui/feedbackModel";
import { createMotion } from "@/ui/motion";
import { find, setText } from "./primitives";
import type { View } from "./primitives";
export const createFeedback = (): View<GameSnapshot> => {
  const element = document.createElement("div");
  element.className = "game-feedback";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.setAttribute("aria-atomic", "true");
  element.innerHTML = `<div class="feedback-toast" hidden><div class="feedback-petals" aria-hidden="true">${Array.from({ length: 6 }, () => "<i></i>").join("")}</div><span class="feedback-symbol"></span><strong></strong><span class="feedback-detail"></span></div>`;
  const toast = find(element, ".feedback-toast");
  const motion = createMotion();
  let previous: Readonly<GameSnapshot> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = (): void => {
    if (timer) clearTimeout(timer);
    toast.hidden = true;
  };
  return {
    element,
    update: (state): void => {
      if (state.phase !== "playing") clear();
      const message = previous ? feedbackMessage(previous, state) : undefined;
      if (message) {
        clear();
        toast.dataset.kind = message.kind;
        find(toast, ".feedback-symbol").innerHTML = icon(
          message.kind === "rescue"
            ? "shield"
            : message.kind === "reward"
              ? "gift"
              : message.kind === "record"
                ? "trophy"
                : "spark"
        );
        setText(toast, "strong", message.title);
        setText(toast, ".feedback-detail", message.detail);
        find(toast, "strong").hidden = !message.title;
        find(toast, ".feedback-detail").hidden = !message.detail;
        toast.hidden = false;
        motion.pop(toast, message.kind !== "normal");
        timer = setTimeout(clear, message.duration);
      }
      previous = { ...state, rewards: { ...state.rewards } };
    },
    dispose: (): void => {
      clear();
      motion.dispose();
    },
  };
};

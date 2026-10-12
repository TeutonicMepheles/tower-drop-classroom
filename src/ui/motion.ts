/** Component-owned, interruptible animations. Never advances the gameplay clock. */
export const createMotion = (): {
  pop: (element: HTMLElement, strong?: boolean) => void;
  dispose: () => void;
} => {
  const active = new Map<HTMLElement, Animation>();
  return {
    pop: (element, strong = false): void => {
      active.get(element)?.cancel();
      active.delete(element);
      const animate = (element as Partial<HTMLElement>).animate;
      const matchMedia = (window as Partial<Window>).matchMedia;
      if (
        !animate ||
        matchMedia?.call(window, "(prefers-reduced-motion: reduce)").matches
      )
        return;
      const animation = animate.call(
        element,
        [
          { transform: "translateY(3px) scale(0.94)" },
          {
            transform: `translateY(-3px) scale(${strong ? 1.18 : 1.08})`,
            offset: 0.4,
          },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: strong ? 540 : 380, easing: "cubic-bezier(.2,.75,.3,1)" }
      );
      active.set(element, animation);
      animation.onfinish = (): void => {
        if (active.get(element) === animation) active.delete(element);
      };
    },
    dispose: (): void => {
      active.forEach((animation) => {
        animation.cancel();
      });
      active.clear();
    },
  };
};

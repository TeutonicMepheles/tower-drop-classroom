export function bindInput(drop: () => void): () => void {
  const onClick = (event: Event): void => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        "button, select, input, label, a, [data-game-control]"
      )
    )
      return;
    drop();
  };
  window.addEventListener("click", onClick);
  return () => {
    window.removeEventListener("click", onClick);
  };
}

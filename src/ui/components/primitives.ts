export interface View<T> {
  element: HTMLElement;
  update(state: Readonly<T>): void;
  dispose(): void;
}
export const find = (root: HTMLElement, selector: string): HTMLElement =>
  root.querySelector<HTMLElement>(selector)!;
export const setText = (
  root: HTMLElement,
  selector: string,
  value: string | number
): void => {
  const target = find(root, selector);
  const text = String(value);
  if (target.textContent !== text) target.textContent = text;
};
export const dots = (level: number, max: number): string =>
  `<span class="level-dots" aria-hidden="true">${Array.from({ length: max }, (_, index) => `<i class="${index < level ? "is-filled" : ""}"></i>`).join("")}</span>`;

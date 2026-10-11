import type { ButtonComponent } from "@/ui/components/Button/component";
import type { ButtonProps } from "@/ui/components/Button/props";

const Button = ({
  id,
  ariaLabel,
  type,
  className,
  children,
  onClick,
}: ButtonProps): ButtonComponent => {
  const button = document.createElement("button") as ButtonComponent;
  button.id = id;
  button.type = type ?? "button";
  button.className = `button ${className ?? ""}`;
  button.setAttribute("aria-label", ariaLabel);

  button.innerHTML = children ?? "";

  if (button.type === "button" && onClick) {
    button.addEventListener("click", onClick);

    button.cleanup = (): void => {
      button.removeEventListener("click", onClick);
    };
  }

  return button;
};

export default Button;

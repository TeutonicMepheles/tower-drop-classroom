import "./atmosphere.css";

/** Screen-space scenery; never intercepts gameplay input. */
export class Atmosphere {
  private root: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "art-atmosphere";
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML =
      '<div class="art-aurora"></div><div class="art-orbit"></div><div class="art-stars"></div><div class="art-mist"></div><div class="art-mist art-mist--far"></div>';
    const stars = this.root.querySelector(".art-stars")!;
    for (let i = 0; i < 36; i++) {
      const star = document.createElement("i");
      star.style.left = `${(i * 73 + 17) % 100}%`;
      star.style.top = `${(i * 37 + 11) % 100}%`;
      star.style.setProperty("--delay", `${-i * 0.7}s`);
      star.style.setProperty("--size", `${i % 5 === 0 ? 3 : 1}px`);
      stars.append(star);
    }
    container.prepend(this.root);
  }

  public dispose(): void {
    this.root.remove();
  }
}

import "@/ui/styles/global.css";
import { createGameApp } from "./createGameApp";
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app mount point");
let page = createGameApp();
app.replaceChildren(page);
const cleanup = (): void => {
  page.cleanup?.();
};
const restore = (event: PageTransitionEvent): void => {
  if (!event.persisted) return;
  page = createGameApp();
  app.replaceChildren(page);
};
window.addEventListener("pagehide", cleanup);
window.addEventListener("pageshow", restore);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cleanup();
    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("pageshow", restore);
  });

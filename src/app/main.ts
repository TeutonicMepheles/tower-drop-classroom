import "@/ui/styles/global.css";
import { createGameApp } from "./createGameApp";
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app mount point");
const page = createGameApp();
app.replaceChildren(page);
window.addEventListener(
  "pagehide",
  () => {
    page.cleanup?.();
  },
  { once: true }
);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    page.cleanup?.();
  });

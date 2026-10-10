import type { BlockData } from "@/contracts/game";
export function measureLanding(
  top: BlockData,
  bottom: BlockData,
  tolerance: number
): { delta: number; overlap: number; perfect: boolean } {
  const raw = top.position[top.direction] - bottom.position[top.direction];
  const perfect = Math.abs(raw) <= tolerance;
  const delta = perfect ? 0 : raw;
  const size = top.direction === "x" ? top.sizes.width : top.sizes.depth;
  return { delta, overlap: size - Math.abs(delta), perfect };
}

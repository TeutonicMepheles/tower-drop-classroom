import type { BlockData } from "@/contracts/game";
export function measureLanding(
  top: BlockData,
  bottom: BlockData,
  tolerance: number
): { delta: number; overlap: number; perfect: boolean } {
  const raw = top.position[top.direction] - bottom.position[top.direction];
  const size = top.direction === "x" ? top.sizes.width : top.sizes.depth;
  const supportSize =
    top.direction === "x" ? bottom.sizes.width : bottom.sizes.depth;
  // Never snap across more than 20% of the smaller block on the moving axis.
  const cappedTolerance = Math.min(
    tolerance,
    Math.min(size, supportSize) * 0.2
  );
  const perfect = Math.abs(raw) <= cappedTolerance;
  const delta = perfect ? 0 : raw;
  return { delta, overlap: size - Math.abs(delta), perfect };
}

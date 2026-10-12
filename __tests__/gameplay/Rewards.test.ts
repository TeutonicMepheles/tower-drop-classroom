/** @jest-environment node */
import {
  drawRewards,
  emptyRewards,
  availableRewards,
} from "@/gameplay/rewards";

it("draws unique options and guarantees narrow towers a repair", () => {
  for (const value of [0, 0.3, 0.6, 0.999]) {
    const choices = drawRewards(emptyRewards(), 0, true, () => value);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(choices).toContain("repair");
  }
});
it("filters full upgrades without leaving an empty reward screen", () => {
  const levels = {
    ...emptyRewards(),
    precision: 3,
    perfectRepair: 3,
    steady: 3,
  };
  expect(availableRewards(levels, 2)).toEqual(["repair"]);
  expect(drawRewards(levels, 2, false)).toEqual(["repair"]);
  expect(availableRewards(levels, 1)).toContain("shield");
  expect(drawRewards(levels, 2, false, () => 0, false)).toEqual([]);
  expect(drawRewards(emptyRewards(), 0, false, () => 0, false)).not.toContain(
    "repair"
  );
});

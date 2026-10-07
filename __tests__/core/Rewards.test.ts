import { drawRewards, emptyRewards, availableRewards } from "@/config/rewards";
import { loadRecords, saveRecords } from "@/core/records";

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
    slow: 3,
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
it("persists separate records and tolerates corrupted storage", () => {
  localStorage.clear();
  saveRecords({ easy: 18, normal: 12 });
  expect(loadRecords()).toEqual({ easy: 18, normal: 12 });
  localStorage.setItem("tower-drop:records:v1", '{"easy":-2,"normal":"99"}');
  expect(loadRecords()).toEqual({ easy: 0, normal: 0 });
  localStorage.setItem("tower-drop:records:v1", "broken");
  expect(loadRecords()).toEqual({ easy: 0, normal: 0 });
});
it("continues when browser storage is blocked", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(loadRecords()).toEqual({ easy: 0, normal: 0 });
  expect(() => {
    saveRecords({ easy: 1, normal: 2 });
  }).not.toThrow();
});

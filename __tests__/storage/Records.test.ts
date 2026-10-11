import { loadRecords, saveRecords } from "@/storage/records";
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

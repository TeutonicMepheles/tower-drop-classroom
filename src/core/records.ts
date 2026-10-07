import type { Difficulty } from "../config/gameConfig";
const KEY = "tower-drop:records:v1";
export type Records = Record<Difficulty, number>;
export function loadRecords(): Records {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(KEY) ?? "{}"
    ) as Partial<Records> | null;
    const safe = (value: unknown): number =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0;
    return { easy: safe(parsed?.easy), normal: safe(parsed?.normal) };
  } catch {
    return { easy: 0, normal: 0 };
  }
}
export function saveRecords(records: Records): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    /* Session record still works when storage is unavailable. */
  }
}

import type { Records } from "./game";
export interface RecordStore {
  load(): Records;
  save(records: Records): void;
}

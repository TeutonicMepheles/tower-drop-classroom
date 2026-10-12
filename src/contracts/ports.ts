import type {
  BlockData,
  GameEvent,
  GameSnapshot,
  Records,
  Vector3,
} from "@/contracts/game";
export interface RecordStore {
  load(): Records;
  save(records: Records): void;
}
export interface FragmentPose {
  block: BlockData;
  position: Vector3;
  quaternion: { x: number; y: number; z: number; w: number };
}
export interface ScenePort {
  hitTestMovingBlock(clientX: number, clientY: number): boolean;
  sync(blocks: readonly BlockData[], fragments: readonly FragmentPose[]): void;
  feedback(events: readonly GameEvent[], phase: GameSnapshot["phase"]): void;
  follow(layers: number, movement: number): void;
  readonly cameraHeight: number;
  render(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  reset(): void;
  dispose(): void;
}
export interface PhysicsPort {
  sync(blocks: readonly BlockData[]): void;
  addFragment(block: BlockData): void;
  step(minHeight: number, frameScale?: number): void;
  getFragments(): FragmentPose[];
  reset(): void;
  dispose(): void;
}
export interface AnimationDriver {
  setAnimationLoop(callback: ((time?: number) => void) | null): void;
}

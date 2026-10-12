import * as CANNON from "cannon";
import type { BlockData } from "@/contracts/game";
import type { FragmentPose, PhysicsPort } from "@/contracts/ports";
interface Entry {
  block: BlockData;
  body: CANNON.Body;
}
export class TowerPhysics implements PhysicsPort {
  private readonly world = new CANNON.World();
  private readonly tower = new Map<number, Entry>();
  private readonly fragments = new Map<number, Entry>();
  constructor() {
    this.world.gravity.set(0, -10, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 40;
  }
  private create(block: BlockData, mass: number): Entry {
    const body = new CANNON.Body({ mass });
    const entry = { block, body };
    this.reshape(entry, block);
    this.world.addBody(body);
    return entry;
  }
  private reshape(entry: Entry, block: BlockData): void {
    const { body } = entry;
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    body.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          block.sizes.width / 2,
          block.sizes.height / 2,
          block.sizes.depth / 2
        )
      )
    );
    body.aabbNeedsUpdate = true;
    entry.block = block;
  }
  public sync(blocks: readonly BlockData[]): void {
    const ids = new Set(blocks.map((block) => block.id));
    for (const [id, entry] of this.tower)
      if (!ids.has(id)) {
        this.world.remove(entry.body);
        this.tower.delete(id);
      }
    for (const block of blocks) {
      let entry = this.tower.get(block.id);
      if (!entry) {
        entry = this.create(block, 0);
        this.tower.set(block.id, entry);
      } else if (
        entry.block.sizes.width !== block.sizes.width ||
        entry.block.sizes.depth !== block.sizes.depth ||
        entry.block.sizes.height !== block.sizes.height
      )
        this.reshape(entry, block);
      entry.body.position.set(
        block.position.x,
        block.position.y,
        block.position.z
      );
      entry.body.aabbNeedsUpdate = true;
    }
  }
  public addFragment(block: BlockData): void {
    const entry = this.create(block, 5);
    entry.body.position.set(
      block.position.x,
      block.position.y,
      block.position.z
    );
    this.fragments.set(block.id, entry);
  }
  public step(minHeight: number, frameScale = 1): void {
    if (frameScale > 0) this.world.step(frameScale / 60);
    for (const [id, entry] of this.fragments)
      if (entry.body.position.y < minHeight) {
        this.world.remove(entry.body);
        this.fragments.delete(id);
      }
  }
  public getFragments(): FragmentPose[] {
    return Array.from(this.fragments.values(), ({ block, body }) => ({
      block,
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      quaternion: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
    }));
  }
  public reset(): void {
    for (const entry of [...this.tower.values(), ...this.fragments.values()])
      this.world.remove(entry.body);
    this.tower.clear();
    this.fragments.clear();
  }
  public dispose(): void {
    this.reset();
  }
}

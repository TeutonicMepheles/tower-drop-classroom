import * as CANNON from "cannon";
import { TowerPhysics } from "@/runtime/physics";
import type { BlockData } from "@/contracts/game";
it("updates collision shapes and removes fallen bodies without changing model data", () => {
  jest.clearAllMocks();
  const physics = new TowerPhysics();
  const block: BlockData = {
    id: 1,
    layer: 0,
    position: { x: 0, y: 0, z: 0 },
    sizes: { width: 3, height: 1, depth: 3 },
    direction: "x",
  };
  physics.sync([block]);
  physics.sync([{ ...block, sizes: { ...block.sizes, width: 2 } }]);
  expect(CANNON.Vec3).toHaveBeenLastCalledWith(1, 0.5, 1.5);
  expect(block.sizes.width).toBe(3);
  physics.addFragment({ ...block, id: 2 });
  const body = (CANNON.Body as unknown as jest.Mock).mock.results.at(-1)!.value;
  body.position.y = -30;
  physics.step(-16);
  expect(physics.getFragments()).toHaveLength(0);
  physics.dispose();
  const world = (CANNON.World as unknown as jest.Mock).mock.results.at(
    -1
  )!.value;
  expect(world.remove).toHaveBeenCalledTimes(2);
});

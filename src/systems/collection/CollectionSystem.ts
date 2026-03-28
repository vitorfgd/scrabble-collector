import { Vector3 } from 'three'
import type { CarryStack } from '../stack/CarryStack.ts'
import type { ItemWorld } from '../items/ItemWorld.ts'
import type { PlayerController } from '../player/PlayerController.ts'

const p = new Vector3()

export class CollectionSystem {
  readonly pickupRadius = 0.42

  update(
    player: PlayerController,
    stack: CarryStack,
    itemWorld: ItemWorld,
  ): void {
    player.getPosition(p)
    const r = player.radius + this.pickupRadius
    const r2 = r * r

    for (const [id, { mesh, item }] of itemWorld.entries()) {
      const dx = p.x - mesh.position.x
      const dz = p.z - mesh.position.z
      if (dx * dx + dz * dz <= r2) {
        if (stack.push(item)) {
          itemWorld.detachPickupForCollect(id)
        }
      }
    }
  }
}

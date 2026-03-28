import { Vector3 } from 'three'
import type { ChainSystem } from '../chain/ChainSystem.ts'
import type { ItemWorld } from '../items/ItemWorld.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import {
  MAGNET_EXTRA_RADIUS,
  MAGNET_PULL_SPEED,
  PICKUP_EXTRA_RADIUS,
} from '../../juice/juiceConfig.ts'

const p = new Vector3()

export class CollectionSystem {
  readonly pickupRadius = PICKUP_EXTRA_RADIUS

  update(
    player: PlayerController,
    chain: ChainSystem,
    itemWorld: ItemWorld,
    dt: number,
    onPowerPellet?: () => void,
  ): void {
    player.getPosition(p)
    itemWorld.applyMagnetPull(
      p,
      player.radius + this.pickupRadius,
      MAGNET_EXTRA_RADIUS,
      MAGNET_PULL_SPEED,
      dt,
    )

    const r = player.radius + this.pickupRadius
    const r2 = r * r

    for (const [id, { mesh, item }] of itemWorld.entries()) {
      const dx = p.x - mesh.position.x
      const dz = p.z - mesh.position.z
      if (dx * dx + dz * dz <= r2) {
        if (item.type === 'powerPellet') {
          itemWorld.detachPickupForCollect(id)
          onPowerPellet?.()
          continue
        }
        if (chain.push(item)) {
          itemWorld.detachPickupForCollect(id)
        }
      }
    }
  }
}

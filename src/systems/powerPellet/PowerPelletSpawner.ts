import type { ItemWorld } from '../items/ItemWorld.ts'
import { createPowerPelletItem } from './createPowerPelletItem.ts'
import { POWER_PELLET_RESPAWN_COOLDOWN_SEC, POWER_PELLET_SLOTS } from './powerPelletConfig.ts'

type Slot = {
  x: number
  z: number
  /** Active world pickup id, or null */
  activeId: string | null
  /** `elapsedSec` when this slot may spawn again */
  nextSpawnAt: number
}

/**
 * Fixed-slot power pellets: respawn each slot after cooldown when collected.
 */
export class PowerPelletSpawner {
  private readonly slots: Slot[]

  constructor() {
    this.slots = POWER_PELLET_SLOTS.map((p) => ({
      x: p.x,
      z: p.z,
      activeId: null,
      nextSpawnAt: 0,
    }))
  }

  update(elapsedSec: number, itemWorld: ItemWorld): void {
    for (const s of this.slots) {
      if (s.activeId !== null && !itemWorld.hasPickup(s.activeId)) {
        s.activeId = null
        s.nextSpawnAt = elapsedSec + POWER_PELLET_RESPAWN_COOLDOWN_SEC
      }
      if (s.activeId === null && elapsedSec >= s.nextSpawnAt) {
        const item = createPowerPelletItem()
        itemWorld.spawn(item, s.x, s.z)
        s.activeId = item.id
      }
    }
  }

  onPowerPelletCollected(itemId: string, elapsedSec: number): void {
    const s = this.slots.find((sl) => sl.activeId === itemId)
    if (!s) return
    s.activeId = null
    s.nextSpawnAt = elapsedSec + POWER_PELLET_RESPAWN_COOLDOWN_SEC
  }

  /** Remove all power pellets from the world and reset respawn timers (e.g. spawn mode switch). */
  reset(itemWorld: ItemWorld, elapsedSec: number): void {
    for (const s of this.slots) {
      if (s.activeId !== null) {
        itemWorld.remove(s.activeId)
        s.activeId = null
      }
      s.nextSpawnAt = elapsedSec + POWER_PELLET_RESPAWN_COOLDOWN_SEC
    }
  }
}

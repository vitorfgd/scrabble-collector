import type { GameItem } from '../../core/types/GameItem.ts'
import type { ItemWorld } from './ItemWorld.ts'
import type { SpawnAreaConfig } from './ItemSpawnArea.ts'
import { randomPointInSpawnArea } from './ItemSpawnArea.ts'

/**
 * Spawns logical items + visuals via ItemWorld.
 * Item factory stays in themes (e.g. createCrystalItem).
 */
export function spawnPickupsInArea(
  world: ItemWorld,
  createItem: () => GameItem,
  count: number,
  area: SpawnAreaConfig,
): void {
  for (let i = 0; i < count; i++) {
    const [x, z] = randomPointInSpawnArea(area)
    world.spawn(createItem(), x, z)
  }
}

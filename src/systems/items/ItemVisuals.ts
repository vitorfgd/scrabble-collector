import type { Mesh } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import {
  createCrystalPickupMesh,
  createCrystalStackMesh,
} from '../../themes/crystalQuarry/itemFactory.ts'
import {
  createLetterPickupMesh,
  createLetterStackMesh,
} from '../../themes/letterTile/letterTileMeshes.ts'

/** Theme-facing mesh creation; branches on `type` for visuals only */
export function createPickupMesh(item: GameItem): Mesh {
  if (item.type === 'crystal') {
    return createCrystalPickupMesh(item.hue)
  }
  return createLetterPickupMesh(item)
}

export function createStackMesh(item: GameItem): Mesh {
  if (item.type === 'crystal') {
    return createCrystalStackMesh(item)
  }
  return createLetterStackMesh(item)
}

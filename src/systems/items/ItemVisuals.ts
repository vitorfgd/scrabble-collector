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
import { CHAIN_MESH_SCALE } from '../chain/chainConfig.ts'
import { createPowerPickupMesh } from '../power/createPowerPickupMesh.ts'

/** Theme-facing mesh creation; branches on `type` for visuals only */
export function createPickupMesh(item: GameItem): Mesh {
  if (item.type === 'crystal') {
    return createCrystalPickupMesh(item.hue)
  }
  if (item.type === 'powerPellet') {
    return createPowerPickupMesh()
  }
  return createLetterPickupMesh(item)
}

export function createStackMesh(item: GameItem): Mesh {
  if (item.type === 'crystal') {
    return createCrystalStackMesh(item)
  }
  if (item.type === 'letter') {
    return createLetterStackMesh(item)
  }
  throw new Error('createStackMesh: unsupported item type')
}

/** Carried chain: pickup-style (top-down readable), scaled up vs ground pickups */
export function createChainMesh(
  item: Exclude<GameItem, { type: 'powerPellet' }>,
): Mesh {
  const mesh = createPickupMesh(item)
  mesh.scale.multiplyScalar(CHAIN_MESH_SCALE)
  return mesh
}

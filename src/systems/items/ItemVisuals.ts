import type { Object3D } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import {
  createPelletPickupMeshFromHue,
  createPelletPickupMeshFromLetter,
  createPelletStackMesh,
  createPowerPelletPickupMesh,
} from '../../themes/pellet/pelletMeshes.ts'

/** Pac-Man–style pellets; data model unchanged (crystal hue vs letter). */
export function createPickupMesh(item: GameItem): Object3D {
  if (item.type === 'crystal') {
    return createPelletPickupMeshFromHue(item.hue)
  }
  if (item.type === 'powerPellet') {
    return createPowerPelletPickupMesh()
  }
  return createPelletPickupMeshFromLetter(item.letter)
}

export function createStackMesh(item: GameItem): Object3D {
  return createPelletStackMesh(item)
}

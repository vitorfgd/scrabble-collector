import {
  Color,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
} from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'

/** Theme-only: builds collectible data for Crystal Quarry */
export function createCrystalItem(hue: number, value: number): GameItem {
  return {
    id: crypto.randomUUID(),
    kind: 'collectible',
    type: 'crystal',
    hue,
    value,
  }
}

/** Low-poly octahedron crystal; mesh only ? no gameplay fields */
export function createCrystalPickupMesh(hue: number): Mesh {
  const mesh = new Mesh(
    new OctahedronGeometry(0.38, 0),
    new MeshStandardMaterial({
      color: new Color().setHSL(hue, 0.72, 0.52),
      roughness: 0.4,
      metalness: 0.25,
      emissive: new Color().setHSL(hue, 0.5, 0.08),
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = 0.38
  return mesh
}

export function createCrystalStackMesh(
  item: Extract<GameItem, { type: 'crystal' }>,
): Mesh {
  const mesh = new Mesh(
    new OctahedronGeometry(0.2, 0),
    new MeshStandardMaterial({
      color: new Color().setHSL(item.hue, 0.65, 0.48),
      roughness: 0.45,
      metalness: 0.2,
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

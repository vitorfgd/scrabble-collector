import { BoxGeometry, Color, Mesh, MeshStandardMaterial } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'

/** Stub visuals for a future letter mode */
export function createLetterPickupMesh(
  _item: Extract<GameItem, { type: 'letter' }>,
): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(0.32, 0.36, 0.1),
    new MeshStandardMaterial({
      color: new Color(0.93, 0.91, 0.84),
      roughness: 0.72,
      metalness: 0,
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = 0.2
  return mesh
}

export function createLetterStackMesh(
  _item: Extract<GameItem, { type: 'letter' }>,
): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(0.22, 0.26, 0.08),
    new MeshStandardMaterial({
      color: new Color(0.88, 0.86, 0.78),
      roughness: 0.68,
      metalness: 0,
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

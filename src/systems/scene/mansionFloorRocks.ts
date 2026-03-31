import {
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import {
  CORRIDOR_BOUNDS,
  ROOMS,
  type RoomBounds,
  type RoomId,
} from '../world/mansionRoomData.ts'

const ROCK_GEO = new DodecahedronGeometry(1, 0)

const rockMat = new MeshStandardMaterial({
  color: 0x3a3844,
  emissive: 0x141820,
  emissiveIntensity: 0.06,
  roughness: 0.93,
  metalness: 0.1,
})

const ROOM_IDS: RoomId[] = [
  'SAFE_CENTER',
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTHWEST',
  'NORTHEAST',
  'SOUTHWEST',
  'SOUTHEAST',
]

/** Keep rocks out of the central deposit / upgrade hub disc. */
const DEPOSIT_CLEAR_R = 2.35

const EDGE_INSET = 0.5
const MAX_ROCKS = 96
const PLACE_TRIES = 520

function boundsList(): RoomBounds[] {
  const out: RoomBounds[] = []
  for (const id of ROOM_IDS) {
    out.push(ROOMS[id].bounds)
  }
  out.push(...CORRIDOR_BOUNDS)
  return out
}

/**
 * Small scattered rocks on floors/corridors for ground texture.
 */
export function addMansionFloorRocks(parent: Group): void {
  const pools = boundsList()
  let placed = 0
  for (let t = 0; t < PLACE_TRIES && placed < MAX_ROCKS; t++) {
    const b = pools[Math.floor(Math.random() * pools.length)]!
    const minX = b.minX + EDGE_INSET
    const maxX = b.maxX - EDGE_INSET
    const minZ = b.minZ + EDGE_INSET
    const maxZ = b.maxZ - EDGE_INSET
    if (minX >= maxX || minZ >= maxZ) continue
    const x = minX + Math.random() * (maxX - minX)
    const z = minZ + Math.random() * (maxZ - minZ)
    if (Math.hypot(x, z) < DEPOSIT_CLEAR_R) continue

    const s = 0.055 + Math.random() * 0.095
    const mesh = new Mesh(ROCK_GEO, rockMat)
    mesh.name = 'floorRock'
    mesh.scale.setScalar(s)
    mesh.position.set(x, s * 0.38, z)
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    placed += 1
  }
}

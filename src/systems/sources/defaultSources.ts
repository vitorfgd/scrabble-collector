import type { SourceNodeConfig } from './sourceTypes.ts'

/** Few large nodes; placed away from central deposit (0,0) and upgrade plaza (≈0, -17) */
export const DEFAULT_RESOURCE_SOURCES: SourceNodeConfig[] = [
  {
    id: 'src-nw-vowel',
    worldX: -11,
    worldZ: 11,
    spawnRadius: 5.2,
    ringRadius: 5.45,
    letterKind: 'vowel',
  },
  {
    id: 'src-ne-consonant',
    worldX: 11,
    worldZ: 11,
    spawnRadius: 5.2,
    ringRadius: 5.45,
    letterKind: 'consonant',
  },
  {
    id: 'src-sw-vowel',
    worldX: -11,
    worldZ: -11,
    spawnRadius: 5.2,
    ringRadius: 5.45,
    letterKind: 'vowel',
  },
  {
    id: 'src-se-consonant',
    worldX: 11,
    worldZ: -11,
    spawnRadius: 5.2,
    ringRadius: 5.45,
    letterKind: 'consonant',
  },
]

export const PRIMARY_RESOURCE_SOURCE = DEFAULT_RESOURCE_SOURCES[0]!

/** Point near NW source (for bootstrap pickups only) */
export function getSpawnNearPrimarySource(
  distTowardDeposit = 2.35,
): { x: number; z: number } {
  const sx = PRIMARY_RESOURCE_SOURCE.worldX
  const sz = PRIMARY_RESOURCE_SOURCE.worldZ
  const len = Math.hypot(sx, sz) || 1
  const ux = -sx / len
  const uz = -sz / len
  return { x: sx + ux * distTowardDeposit, z: sz + uz * distTowardDeposit }
}

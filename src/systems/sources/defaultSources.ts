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

import type { GameItem } from '../../core/types/GameItem.ts'

/** Extend with e.g. 'rare', 'high_tier' as new zone kinds are added */
export type LetterZoneId = string

/**
 * One logical region: containment test + how to spawn a pickup for that region.
 * Order in the registry matters if regions overlap (first match wins).
 */
export type LetterZoneDefinition = {
  readonly id: LetterZoneId
  readonly contains: (x: number, z: number) => boolean
  readonly spawn: () => GameItem
}

/**
 * Query-only API used by the world spawner: position → which letter rule applies.
 * Optional layout helper (e.g. future map rules). World pickups now use `ResourceSourceSystem` + `SourceNode`.
 */
export class LetterZoneRegistry {
  private readonly zones: readonly LetterZoneDefinition[]

  constructor(zones: readonly LetterZoneDefinition[]) {
    this.zones = zones
  }

  /** First zone whose `contains` is true at (x, z), or null (e.g. out of bounds) */
  zoneAt(x: number, z: number): LetterZoneDefinition | null {
    for (const zone of this.zones) {
      if (zone.contains(x, z)) return zone
    }
    return null
  }

  spawnFor(zone: LetterZoneDefinition): GameItem {
    return zone.spawn()
  }
}

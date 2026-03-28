/** Axis-aligned spawn footprint on XZ; no meshes ? data only. */
export type SpawnAreaConfig = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Circles (world XZ) to keep clear, e.g. player spawn and deposit pad */
  avoid: ReadonlyArray<{ x: number; z: number; r: number }>
}

/** Matches ground scale in SceneSetup (~40 units); tweak with level design */
export const DEFAULT_PICKUP_SPAWN_AREA: SpawnAreaConfig = {
  minX: -16,
  maxX: 16,
  minZ: -16,
  maxZ: 16,
  avoid: [
    { x: 0, z: 0, r: 2.8 },
    { x: 7, z: 0, r: 4 },
  ],
}

/** Random XZ inside the box, respecting avoid circles. No instancing ? fine for modest pickup counts. */
export function randomPointInSpawnArea(cfg: SpawnAreaConfig): [number, number] {
  for (let i = 0; i < 120; i++) {
    const x = cfg.minX + Math.random() * (cfg.maxX - cfg.minX)
    const z = cfg.minZ + Math.random() * (cfg.maxZ - cfg.minZ)
    let ok = true
    for (const c of cfg.avoid) {
      if (Math.hypot(x - c.x, z - c.z) < c.r) {
        ok = false
        break
      }
    }
    if (ok) return [x, z]
  }
  return [(cfg.minX + cfg.maxX) * 0.5, (cfg.minZ + cfg.maxZ) * 0.5]
}

/** Power pellet pickup: activates vulnerable-ghost mode */

export const POWER_MODE_DURATION_SEC = 6.5

/** Multiplier on `PlayerController` max speed while power mode is active */
export const POWER_MODE_SPEED_MULTIPLIER = 1.12

/** Seconds before a power pellet respawns at its slot after collection */
export const POWER_PELLET_RESPAWN_COOLDOWN_SEC = 22

/** Fixed spawn points (XZ); keep inside playfield, away from deposit center */
export const POWER_PELLET_SLOTS: readonly { x: number; z: number }[] = [
  { x: -14, z: 14 },
  { x: 14, z: 14 },
  { x: -14, z: -12 },
  { x: 14, z: -12 },
]

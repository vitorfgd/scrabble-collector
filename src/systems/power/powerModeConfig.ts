/** Pac-Man style chain power mode */

/** Seconds the player stays powered (chain lethal, enemies flee) */
export const POWER_MODE_DURATION_SEC = 6.5

/** Seconds after collecting a pellet before another can spawn */
export const POWER_PELLET_RESPAWN_SEC = 38

/** Credits per enemy destroyed during power mode */
export const POWER_ENEMY_KILL_CREDITS = 2

/** World spawn position for first / respawned power pellet (XZ) */
export const POWER_PELLET_SPAWN: { x: number; z: number } = { x: 5.4, z: 7.2 }

/** Seconds before a destroyed enemy respawns at its home */
export const POWER_ENEMY_RESPAWN_SEC = 5.2

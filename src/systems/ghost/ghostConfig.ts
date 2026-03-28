/**
 * Ghost AI tuning — adjust here; speeds also in `gameplaySpeed.ts` (player vs ghost balance).
 */

import { DEFAULT_DEPOSIT_ZONE_RADIUS } from '../deposit/DepositZone.ts'

export {
  GHOST_CHASE_SPEED,
  GHOST_FRIGHT_SPEED,
  GHOST_WANDER_SPEED,
} from '../gameplaySpeed.ts'

/** When player is within this horizontal distance, ghost switches to chase */
export const GHOST_DETECT_RADIUS = 6.8

/**
 * After chasing, ghost returns to wander only past this distance (hysteresis vs detect).
 * Must be ≥ `GHOST_DETECT_RADIUS` or ghosts flicker at the edge.
 */
export const GHOST_LOSE_CHASE_RADIUS = 9.2

/**
 * How fast horizontal velocity catches the desired direction (higher = snappier).
 */
export const GHOST_STEERING_ACCEL = 15

/** Seconds between new random wander headings */
export const GHOST_WANDER_TURN_MIN = 0.85
export const GHOST_WANDER_TURN_MAX = 2.35

/** World bounds (XZ); ghost centers are clamped inside the playfield */
export const GHOST_MAP_HALF_X = 18.5
export const GHOST_MAP_HALF_Z = 18.5

export type GhostSpawnSpec = {
  x: number
  z: number
  /** Hex body color (bright, readable from top-down) */
  color: number
}

/** Default layout: two ghosts, opposite corners */
export const DEFAULT_GHOST_SPAWNS: readonly GhostSpawnSpec[] = [
  { x: -11.5, z: 9, color: 0xff3d6b },
  { x: 11.5, z: -9, color: 0x2ee6ff },
]

// --- Player hit (ghost touch) — tension without full reset ---

/** Ghost body radius for circle–circle test with player (`player.radius + this`) */
export const GHOST_COLLISION_RADIUS = 0.44

/**
 * Extra clearance beyond deposit disc + ghost body so ghosts do not skim the drop zone edge.
 */
export const GHOST_DEPOSIT_EXCLUSION_PADDING = 0.14

/**
 * Ghost centers must stay at or beyond this distance from deposit center (0,0) on XZ —
 * deposit disc + ghost body + padding (ghosts cannot enter the safe drop zone).
 */
export const GHOST_DEPOSIT_EXCLUSION_RADIUS =
  DEFAULT_DEPOSIT_ZONE_RADIUS + GHOST_COLLISION_RADIUS + GHOST_DEPOSIT_EXCLUSION_PADDING

/**
 * Extra clearance before another damage hit can register after leaving ghost melee
 * (prevents overlap spam while i-frames expire).
 */
export const GHOST_MELEE_REARM_PADDING = 0.42

/** Fraction of carried stack lost on hit: uniform random in [min, max] */
export const GHOST_HIT_LOSS_MIN = 0.3
export const GHOST_HIT_LOSS_MAX = 0.5

/** Seconds of invulnerability after a hit (ghost cannot register another touch) */
export const GHOST_HIT_INVULN_SEC = 1.55

/** Initial knockback speed away from ghost (world units/s, decays in PlayerController) */
export const GHOST_HIT_KNOCKBACK_SPEED = 7.8

/** Exponential decay on knockback velocity (higher = shorter slide) */
export const GHOST_HIT_KNOCKBACK_DECAY = 17

/** Max pellet meshes spawned for the “lost stack” burst (performance cap) */
export const GHOST_HIT_BURST_MAX_PARTICLES = 14

/** After landing a hit: push ghost this far from player (XZ) so bodies separate */
export const GHOST_POST_HIT_SEPARATION = 0.42

/** Burst velocity away from player after a hit (world units/s, blends with steering) */
export const GHOST_POST_HIT_DISENGAGE_SPEED = 10.5

/** Seconds before this ghost can enter chase again (roam / reposition) */
export const GHOST_POST_HIT_CHASE_LOCKOUT_SEC = 1.65

// --- Power mode: eating ghosts ---

/** Money granted when the player eats a ghost during power mode */
export const GHOST_EAT_MONEY_REWARD = 38

/** Seconds before an eaten ghost respawns at its spawn point */
export const GHOST_RESPAWN_AFTER_EAT_SEC = 4.25

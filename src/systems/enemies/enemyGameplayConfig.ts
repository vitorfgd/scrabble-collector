/**
 * Enemy movement / steering — tuned slower than player (`PlayerController` ~9 u/s)
 * so kiting stays viable. Chain targeting is not implemented here (optional feature).
 */

/** World Y for ghost group origin (feet on ground) */
export const ENEMY_GHOST_BASE_Y = 0.44

/** Uniform scale of ghost mesh group (visual size vs collision radius) */
export const ENEMY_GHOST_VISUAL_SCALE = 0.98

/** Hard cap on horizontal speed (world units / sec) */
export const ENEMY_MAX_SPEED = 4.35

/** Acceleration toward player (seek), scaled by chase weight */
export const ENEMY_SEEK_ACCEL = 11

/** Per-enemy chase aggression multiplier range [min,max] — variation without pathfinding */
export const ENEMY_CHASE_AGGRESSION_MIN = 0.72
export const ENEMY_CHASE_AGGRESSION_MAX = 1.08

/** Wander acceleration (sin/cos) — keeps motion readable, not pure homing */
export const ENEMY_WANDER_ACCEL = 3.8

/** Beyond this distance from player, wander is scaled down (calmer roaming) */
export const ENEMY_WANDER_FAR_DISTANCE = 11

/** Multiplier for wander when far from player */
export const ENEMY_WANDER_FAR_MULT = 0.4

/** When close to player, wander noise is reduced (clearer chase read) */
export const ENEMY_WANDER_CHASE_BLEND_NEAR = 0.38

/** Distance below which ENEMY_WANDER_CHASE_BLEND_NEAR applies fully */
export const ENEMY_WANDER_CHASE_NEAR_DIST = 4.5

/** Low-pass steering on acceleration (higher = smoother direction changes) */
export const ENEMY_STEER_SMOOTH = 6.2

/** Pull back toward spawn home so the map stays populated */
export const ENEMY_HOME_PULL_ACCEL = 1.15

/** Push apart when closer than this (XZ, world units) */
export const ENEMY_SEPARATION_RADIUS = 1.35

/** Separation push strength (acceleration scale) */
export const ENEMY_SEPARATION_ACCEL = 9

/** Velocity damping per second (higher = heavier feel) */
export const ENEMY_VELOCITY_DAMP = 2.85

/** Max acceleration per frame step (smooth turning) */
export const ENEMY_ACCEL_CLAMP = 22

/** While player is powered: flee acceleration scale vs normal seek */
export const ENEMY_FEAR_FLEE_MULT = 2.35

/** Lerp speed toward fear palette (per second) */
export const ENEMY_FEAR_COLOR_LERP = 8

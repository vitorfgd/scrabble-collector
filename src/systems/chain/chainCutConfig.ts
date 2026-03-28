/** Chain vs enemy cut — radii, cooldown, VFX */

/** XZ hit radius per chain link (added to enemy radius for overlap test) */
export const CHAIN_SEGMENT_HIT_RADIUS = 0.38

/** World XZ radius of each enemy (ghost collision cylinder / probe) */
export const ENEMY_RADIUS = 0.34

/** Seconds before another cut can register (rapid overlaps / multi-enemy) */
export const CHAIN_CUT_COOLDOWN_SEC = 0.28

/**
 * When an enemy overlaps the player body (not just the chain), the cut index is
 * forced to at most this value — lower = harsher (smaller index = closer to head).
 * 1 = keep at most the single newest link; worsens a mild tail-only chain hit.
 * Single-link chain uses index 0 (full loss) — see ChainCutSystem.
 */
export const PLAYER_CONTACT_STRIKE_INDEX = 1

/** Ring burst: scale growth rate, fade duration */
export const CUT_BURST_RING_DURATION_SEC = 0.22
export const CUT_BURST_RING_MAX_SCALE = 4.2

/** Lost segments: outward scatter speed range (world units / sec) */
export const CUT_SCATTER_SPEED_MIN = 2.2
export const CUT_SCATTER_SPEED_MAX = 5.8
export const CUT_SCATTER_UP = 3.4
export const CUT_SCATTER_SPIN = 7
export const CUT_SCATTER_FADE_SEC = 0.42
/** Animate at most this many meshes; rest are disposed immediately */
export const CUT_SCATTER_MAX_ANIMATED = 14

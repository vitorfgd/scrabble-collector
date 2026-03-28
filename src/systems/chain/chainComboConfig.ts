/**
 * Chain break combo — consecutive chain kills within a short window.
 */

/** Seconds to land another chain kill before the streak resets */
export const CHAIN_COMBO_WINDOW_SEC = 1.35

/**
 * Reward multiplier for this kill: `1 + (combo - 1) * CHAIN_COMBO_REWARD_PER_STEP`, then capped.
 * Combo 1 → 1 (no extra). Combo 2+ → bonus scales with streak length.
 */
export const CHAIN_COMBO_REWARD_PER_STEP = 0.14

/** Max combo reward multiplier (applied on top of chain length multiplier) */
export const CHAIN_COMBO_REWARD_MULT_MAX = 2.25

/** Minimum combo count to trigger optional screen shake (inclusive) */
export const CHAIN_COMBO_SHAKE_AT_COMBO = 5

/** Peak shake offset in world units (scaled down each impulse) */
export const CHAIN_COMBO_SHAKE_MAG = 0.22

/** How long one shake impulse lasts (seconds) */
export const CHAIN_COMBO_SHAKE_DURATION_SEC = 0.14

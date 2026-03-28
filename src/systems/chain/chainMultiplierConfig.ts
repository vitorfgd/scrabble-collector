/**
 * Chain length → payout multiplier (deposit + optional enemy kills).
 * Tiers are inclusive of minCount upward until the next higher minCount.
 *
 * Example (default):
 * - 1–5 items → ×1
 * - 6–10 → ×2
 * - 11+ → ×3
 */

export type ChainMultiplierTier = { minCount: number; mult: number }

/** Descending minCount; first match wins */
export const CHAIN_MULTIPLIER_TIERS: readonly ChainMultiplierTier[] = [
  { minCount: 11, mult: 3 },
  { minCount: 6, mult: 2 },
  { minCount: 1, mult: 1 },
]

/**
 * If a cut removes at least this many links, apply a stronger “reset” pulse on the multiplier HUD.
 * (Tier still follows current length; this is feedback only.)
 */
export const CHAIN_MULTIPLIER_SIGNIFICANT_CUT_MIN_LOST = 2

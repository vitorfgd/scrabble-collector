import { CHAIN_MULTIPLIER_TIERS } from './chainMultiplierConfig.ts'

/**
 * Integer multiplier for current chain length. Empty chain → ×1 (no bonus).
 */
export function getChainMultiplierForLength(chainCount: number): number {
  if (chainCount <= 0) return 1
  for (const tier of CHAIN_MULTIPLIER_TIERS) {
    if (chainCount >= tier.minCount) return tier.mult
  }
  return 1
}
